// Inspired by dunkyl's tauri-snap-layout
// but adapted to work as a Tauri plugin.
// Reference: https://github.com/dunkyl/tauri-snap-layout

use std::collections::HashMap;
use std::ffi::c_void;
use std::mem::size_of;
use std::sync::{Arc, Mutex, Once, OnceLock};

use raw_window_handle::{HasWindowHandle, RawWindowHandle};
use tauri::Runtime;
use windows::core::{w, Error, Result, HRESULT, PCWSTR};
use windows::Win32::Foundation::{HINSTANCE, HWND, LPARAM, LRESULT, RECT, WPARAM};
use windows::Win32::Graphics::Gdi::HBRUSH;
use windows::Win32::System::LibraryLoader::GetModuleHandleW;
use windows::Win32::UI::HiDpi::GetDpiForWindow;
use windows::Win32::UI::Input::KeyboardAndMouse::{
    TrackMouseEvent, TME_LEAVE, TME_NONCLIENT, TRACKMOUSEEVENT,
};
use windows::Win32::UI::Shell::{DefSubclassProc, RemoveWindowSubclass, SetWindowSubclass};
use windows::Win32::UI::WindowsAndMessaging::{
    CreateWindowExW, DefWindowProcW, DestroyWindow, GetClientRect, LoadCursorW, RegisterClassExW,
    SetCursor, SetWindowPos, HCURSOR, HICON, HMENU, HTMAXBUTTON, HWND_TOP, IDC_HAND,
    SWP_ASYNCWINDOWPOS, WINDOW_EX_STYLE, WM_DPICHANGED, WM_NCHITTEST, WM_NCLBUTTONDOWN,
    WM_NCLBUTTONUP, WM_NCMOUSELEAVE, WM_NCMOUSEMOVE, WM_SETCURSOR, WM_SIZE, WNDCLASSEXW,
    WNDCLASS_STYLES, WS_CHILD, WS_CLIPSIBLINGS, WS_OVERLAPPED, WS_VISIBLE,
};

#[derive(Debug, Clone, Copy)]
pub enum WindowCorner {
    TopRight,
}

#[derive(Debug, Clone, Copy)]
pub struct SnapLayoutConfig {
    pub relative_to: WindowCorner,
    pub offset_x: i32,
    pub offset_y: i32,
    pub width: i32,
    pub height: i32,
    pub hand_cursor: bool,
}

impl Default for SnapLayoutConfig {
    fn default() -> Self {
        Self {
            relative_to: WindowCorner::TopRight,
            offset_x: 46,
            offset_y: 0,
            width: 46,
            height: 45,
            hand_cursor: false,
        }
    }
}

#[derive(Debug, Clone, Copy)]
pub enum MaxButtonEvent {
    LeftButtonDown,
    LeftButtonUp,
    MouseEnter,
    MouseLeave,
}

type EventCallback = Arc<Mutex<Box<dyn FnMut(MaxButtonEvent) + Send + 'static>>>;

struct SnapLayoutState {
    config: SnapLayoutConfig,
    enabled: bool,
    is_mouse_over: bool,
    callback: EventCallback,
}

static STATES: OnceLock<Mutex<HashMap<usize, SnapLayoutState>>> = OnceLock::new();

static REGISTER_CLASS: Once = Once::new();

const SUBCLASS_ID: usize = 0x534E_4150; // 'SNAP'

const E_FAIL: HRESULT = HRESULT(0x8000_4005u32 as i32);

fn hwnd_key(hwnd: HWND) -> usize {
    hwnd.0 as usize
}

fn states() -> &'static Mutex<HashMap<usize, SnapLayoutState>> {
    STATES.get_or_init(|| Mutex::new(HashMap::new()))
}

fn register_overlay_class() {
    REGISTER_CLASS.call_once(|| unsafe {
        let class = WNDCLASSEXW {
            cbSize: size_of::<WNDCLASSEXW>() as u32,
            style: WNDCLASS_STYLES::default(),
            lpfnWndProc: Some(overlay_window_proc),
            cbClsExtra: 0,
            cbWndExtra: 0,
            hInstance: HINSTANCE(GetModuleHandleW(PCWSTR::null()).unwrap_or_default().0),
            hIcon: HICON::default(),
            hCursor: HCURSOR::default(),
            hbrBackground: HBRUSH::default(),
            lpszMenuName: PCWSTR::null(),
            lpszClassName: w!("TAURI_SNAP_LAYOUT_OVERLAY"),
            hIconSm: HICON::default(),
        };

        let _ = RegisterClassExW(&class);
    });
}

pub struct SnapLayoutHandle {
    parent: usize,
    overlay: usize,
}

impl SnapLayoutHandle {
    fn parent_hwnd(&self) -> HWND {
        HWND(self.parent as *mut c_void)
    }

    fn overlay_hwnd(&self) -> HWND {
        HWND(self.overlay as *mut c_void)
    }

    pub fn set_enabled(&self, enabled: bool) -> Result<()> {
        unsafe { set_overlay_enabled(self.parent_hwnd(), self.overlay_hwnd(), enabled) }
    }
}

impl Drop for SnapLayoutHandle {
    fn drop(&mut self) {
        unsafe {
            let parent = self.parent_hwnd();
            let overlay = self.overlay_hwnd();
            let _ = RemoveWindowSubclass(parent, Some(subclass_proc), SUBCLASS_ID);
            let _ = DestroyWindow(overlay);
        }
        states().lock().unwrap().remove(&self.overlay);
    }
}

pub fn hwnd_from_tauri_window<R: Runtime>(window: &tauri::WebviewWindow<R>) -> Result<HWND> {
    let handle = window
        .window_handle()
        .map_err(|_| Error::new(E_FAIL, "failed to get raw window handle from Tauri window"))?;

    match handle.as_raw() {
        RawWindowHandle::Win32(win32) => Ok(HWND(win32.hwnd.get() as *mut c_void)),
        _ => Err(Error::new(E_FAIL, "window is not backed by Win32 HWND")),
    }
}

#[cfg(not(target_os = "windows"))]
pub struct SnapLayoutHandle;

#[cfg(not(target_os = "windows"))]
pub fn hwnd_from_tauri_window<R: tauri::Runtime>(
    _: &tauri::WebviewWindow<R>,
) -> Result<(), String> {
    Err("snap layout overlay is only available on Windows".into())
}

pub fn install_snap_layout<F>(
    parent: HWND,
    config: SnapLayoutConfig,
    callback: F,
) -> Result<SnapLayoutHandle>
where
    F: FnMut(MaxButtonEvent) + Send + 'static,
{
    register_overlay_class();

    let overlay = unsafe { create_overlay_window(parent)? };

    states().lock().unwrap().insert(
        hwnd_key(overlay),
        SnapLayoutState {
            config,
            enabled: true,
            is_mouse_over: false,
            callback: Arc::new(Mutex::new(Box::new(callback))),
        },
    );

    unsafe {
        update_overlay_position(parent, overlay);
        SetWindowSubclass(parent, Some(subclass_proc), SUBCLASS_ID, hwnd_key(overlay)).ok()?;
    }

    Ok(SnapLayoutHandle {
        parent: hwnd_key(parent),
        overlay: hwnd_key(overlay),
    })
}

#[cfg(not(target_os = "windows"))]
pub fn install_snap_layout<F>(_: (), _: SnapLayoutConfig, _: F) -> Result<SnapLayoutHandle, String>
where
    F: FnMut(MaxButtonEvent) + Send + 'static,
{
    Err("snap layout overlay is only available on Windows".into())
}

unsafe fn create_overlay_window(parent: HWND) -> Result<HWND> {
    let instance = HINSTANCE(GetModuleHandleW(PCWSTR::null()).unwrap_or_default().0);

    CreateWindowExW(
        WINDOW_EX_STYLE::default(),
        w!("TAURI_SNAP_LAYOUT_OVERLAY"),
        PCWSTR::null(),
        WS_CHILD | WS_VISIBLE | WS_CLIPSIBLINGS | WS_OVERLAPPED,
        0,
        0,
        0,
        0,
        Some(parent),
        Some(HMENU::default()),
        Some(instance),
        None,
    )
}

unsafe fn update_overlay_position(parent: HWND, overlay: HWND) {
    let state = {
        let guard = states().lock().unwrap();
        guard.get(&hwnd_key(overlay)).map(|s| (s.config, s.enabled))
    };

    let Some((config, enabled)) = state else {
        return;
    };

    if !enabled {
        let _ = SetWindowPos(overlay, Some(HWND_TOP), 0, 0, 0, 0, SWP_ASYNCWINDOWPOS);
        return;
    }

    let mut rect = RECT::default();
    if GetClientRect(parent, &mut rect).is_err() {
        return;
    }

    let width = rect.right - rect.left;
    let dpi = GetDpiForWindow(overlay);
    let scale = dpi as f64 / 96.0;

    let offset_x = (config.offset_x as f64 * scale).round() as i32;
    let offset_y = (config.offset_y as f64 * scale).round() as i32;
    let overlay_w = (config.width as f64 * scale).round() as i32;
    let overlay_h = (config.height as f64 * scale).round() as i32;

    let (x, y) = match config.relative_to {
        WindowCorner::TopRight => (width - offset_x - overlay_w, offset_y),
    };

    let _ = SetWindowPos(
        overlay,
        Some(HWND_TOP),
        x,
        y,
        overlay_w,
        overlay_h,
        SWP_ASYNCWINDOWPOS,
    );
}

fn callback_for_overlay(overlay: HWND) -> Option<EventCallback> {
    let guard = states().lock().unwrap();
    guard
        .get(&hwnd_key(overlay))
        .map(|s| Arc::clone(&s.callback))
}

fn use_hand_cursor(overlay: HWND) -> bool {
    let guard = states().lock().unwrap();
    guard
        .get(&hwnd_key(overlay))
        .map(|s| s.config.hand_cursor)
        .unwrap_or(false)
}

fn is_enabled(overlay: HWND) -> bool {
    let guard = states().lock().unwrap();
    guard
        .get(&hwnd_key(overlay))
        .map(|s| s.enabled)
        .unwrap_or(false)
}

unsafe fn set_overlay_enabled(parent: HWND, overlay: HWND, enabled: bool) -> Result<()> {
    let leave_callback = {
        let mut guard = states().lock().unwrap();
        let Some(state) = guard.get_mut(&hwnd_key(overlay)) else {
            return Ok(());
        };

        if state.enabled == enabled {
            return Ok(());
        }

        state.enabled = enabled;

        if !enabled && state.is_mouse_over {
            state.is_mouse_over = false;
            Some(Arc::clone(&state.callback))
        } else {
            None
        }
    };

    update_overlay_position(parent, overlay);
    emit(leave_callback, MaxButtonEvent::MouseLeave);
    Ok(())
}

fn set_mouse_over(overlay: HWND, mouse_over: bool) -> Option<EventCallback> {
    let mut guard = states().lock().unwrap();
    let state = guard.get_mut(&hwnd_key(overlay))?;

    if state.is_mouse_over == mouse_over {
        return None;
    }

    state.is_mouse_over = mouse_over;
    Some(Arc::clone(&state.callback))
}

fn emit(callback: Option<EventCallback>, event: MaxButtonEvent) {
    if let Some(callback) = callback {
        if let Ok(mut cb) = callback.lock() {
            (cb)(event);
        }
    }
}

unsafe extern "system" fn subclass_proc(
    hwnd: HWND,
    msg: u32,
    wparam: WPARAM,
    lparam: LPARAM,
    _subclass_id: usize,
    data_ptr: usize,
) -> LRESULT {
    let overlay = HWND(data_ptr as *mut c_void);

    match msg {
        WM_SIZE | WM_DPICHANGED => update_overlay_position(hwnd, overlay),
        _ => {}
    }

    DefSubclassProc(hwnd, msg, wparam, lparam)
}

unsafe extern "system" fn overlay_window_proc(
    hwnd: HWND,
    msg: u32,
    wparam: WPARAM,
    lparam: LPARAM,
) -> LRESULT {
    if !is_enabled(hwnd) {
        return DefWindowProcW(hwnd, msg, wparam, lparam);
    }

    match msg {
        WM_NCHITTEST => {
            return LRESULT(HTMAXBUTTON as isize);
        }
        WM_NCLBUTTONDOWN => {
            emit(callback_for_overlay(hwnd), MaxButtonEvent::LeftButtonDown);
            return LRESULT(0);
        }
        WM_NCLBUTTONUP => {
            emit(callback_for_overlay(hwnd), MaxButtonEvent::LeftButtonUp);
            return LRESULT(0);
        }
        WM_NCMOUSEMOVE => {
            emit(set_mouse_over(hwnd, true), MaxButtonEvent::MouseEnter);

            let mut track = TRACKMOUSEEVENT {
                cbSize: size_of::<TRACKMOUSEEVENT>() as u32,
                dwFlags: TME_LEAVE | TME_NONCLIENT,
                hwndTrack: hwnd,
                dwHoverTime: 0,
            };
            let _ = TrackMouseEvent(&mut track);
            return LRESULT(0);
        }
        WM_NCMOUSELEAVE => {
            emit(set_mouse_over(hwnd, false), MaxButtonEvent::MouseLeave);
            return LRESULT(0);
        }
        WM_SETCURSOR => {
            if use_hand_cursor(hwnd) {
                let _ = SetCursor(Some(LoadCursorW(None, IDC_HAND).unwrap_or_default()));
                return LRESULT(1);
            }
        }
        _ => {}
    }

    DefWindowProcW(hwnd, msg, wparam, lparam)
}
