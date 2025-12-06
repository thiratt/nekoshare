import { useState, useEffect, useCallback, useMemo } from "react";

import { FolderOpen, Check } from "lucide-react";
import { LuLoader, LuX } from "react-icons/lu";
import { open } from "@tauri-apps/plugin-dialog";
import { documentDir, join } from "@tauri-apps/api/path";

import { Button } from "@workspace/ui/components/button";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldSet,
} from "@workspace/ui/components/field";
import { Input } from "@workspace/ui/components/input";
import { Switch } from "@workspace/ui/components/switch";
import { AnimatedContainer } from "@workspace/app-ui/components/provide-animate";

import { useStore } from "@/hooks/useStore";

const FOLDER_NAME = "Nekoshare";
const DIALOG_TITLE = "Select Save Location";

function SetupApplicationUI({
  onSetupComplete,
}: {
  onSetupComplete?: () => void;
}) {
  const { set: saveToStore, isLoading: isStoreLoading } = useStore();

  const [defaultDocPath, setDefaultDocPath] = useState<string>("");
  const [selectedPath, setSelectedPath] = useState<string>("");
  const [createSubfolder, setCreateSubfolder] = useState(true);
  const [finalPath, setFinalPath] = useState<string>("");

  const [isInitializing, setIsInitializing] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const init = async () => {
      try {
        const docDir = await documentDir();
        if (mounted) {
          setDefaultDocPath(docDir);
          setSelectedPath(docDir);
        }
      } catch (err) {
        console.error("Failed to get document dir", err);
        if (mounted) {
          setError("Failed to initialize default path");
        }
      } finally {
        if (mounted) {
          setIsInitializing(false);
        }
      }
    };
    init();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!selectedPath) return;

    let mounted = true;
    const calculatePath = async () => {
      try {
        const path = createSubfolder
          ? await join(selectedPath, FOLDER_NAME)
          : selectedPath;

        if (mounted) {
          setFinalPath(path);
        }
      } catch (err) {
        console.error("Error joining paths", err);
      }
    };
    calculatePath();
    return () => {
      mounted = false;
    };
  }, [selectedPath, createSubfolder]);

  const isDefault = useMemo(() => {
    if (!defaultDocPath || !selectedPath) return true;
    return selectedPath === defaultDocPath && createSubfolder === true;
  }, [defaultDocPath, selectedPath, createSubfolder]);

  const handleSelectFolder = useCallback(async () => {
    try {
      setError(null);
      const selected = await open({
        directory: true,
        multiple: false,
        title: DIALOG_TITLE,
        defaultPath: selectedPath || defaultDocPath,
      });

      if (selected && typeof selected === "string") {
        setSelectedPath(selected);
        const isNekoshareFolder =
          selected.endsWith(FOLDER_NAME) ||
          selected.endsWith(FOLDER_NAME + "\\") ||
          selected.endsWith(FOLDER_NAME + "/");

        if (isNekoshareFolder) {
          setCreateSubfolder(false);
        } else {
          setCreateSubfolder(true);
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      console.error("Error selecting folder:", err);
      setError(`Failed to select folder: ${msg}`);
    }
  }, [selectedPath, defaultDocPath]);

  const handleResetToDefault = useCallback(() => {
    setSelectedPath(defaultDocPath);
    setCreateSubfolder(true);
    setError(null);
  }, [defaultDocPath]);

  const handleSaveSettings = useCallback(async () => {
    if (!finalPath) return;

    setIsSaving(true);
    setError(null);

    try {
      console.log("Saving settings:", { finalPath, createSubfolder });
      await saveToStore("appConfig", {
        isSetup: true,
        fileLocation: finalPath,
      });

      if (onSetupComplete) {
        onSetupComplete();
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      console.error("Error saving settings:", err);
      setError(`Failed to save settings: ${msg}`);
    } finally {
      setIsSaving(false);
    }
  }, [finalPath, createSubfolder, saveToStore]);

  return (
    <div className="w-full max-w-2xl space-y-8 rounded-lg border bg-card p-8 shadow-lg">
      <header className="space-y-2 text-center">
        <h1 className="text-3xl font-bold tracking-tight">
          ยินดีต้อนรับสู่ Nekoshare
        </h1>
        <p className="text-muted-foreground">
          ตั้งค่าตำแหน่งบันทึกเริ่มต้นสำหรับไฟล์ที่ได้รับ
        </p>
      </header>

      <div className="space-y-6">
        <FieldSet>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="save-location">
                ตำแหน่งบันทึกเริ่มต้น
              </FieldLabel>
              <div className="flex">
                <Input
                  id="save-location"
                  value={finalPath}
                  placeholder={
                    isInitializing ? "Loading..." : "Select a folder..."
                  }
                  className="flex-1 pointer-events-none truncate"
                  readOnly
                  aria-label="Selected save location path"
                  aria-invalid={!!error}
                  title={finalPath}
                />
                <Button
                  className="ml-2"
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={handleSelectFolder}
                  aria-label="Browse for folder"
                  disabled={isInitializing || isSaving || isStoreLoading}
                >
                  <FolderOpen className="h-4 w-4" />
                </Button>
                <AnimatedContainer show={!isDefault}>
                  <Button
                    className="ml-2"
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={handleResetToDefault}
                    aria-label="Reset to default location"
                    disabled={isInitializing || isSaving || isStoreLoading}
                  >
                    <LuX className="h-4 w-4" />
                  </Button>
                </AnimatedContainer>
              </div>
              {error && (
                <p className="text-sm text-destructive mt-1">{error}</p>
              )}
              <FieldDescription>
                ไฟล์ทั้งหมดที่คุณได้รับจะถูกบันทึกในตำแหน่งนี้โดยค่าเริ่มต้น
              </FieldDescription>
              <Field orientation="horizontal">
                <Switch
                  id="create-new-folder"
                  checked={createSubfolder}
                  onCheckedChange={setCreateSubfolder}
                  disabled={isInitializing || isSaving || isStoreLoading}
                  aria-label="Create new folder for received files"
                />
                <FieldLabel htmlFor="create-new-folder">
                  สร้างโฟลเดอร์ "{FOLDER_NAME}" ในตำแหน่งที่เลือก
                </FieldLabel>
              </Field>
            </Field>
          </FieldGroup>
        </FieldSet>
        <Button
          onClick={handleSaveSettings}
          disabled={!finalPath || isInitializing || isSaving || isStoreLoading}
          className="w-full"
          size="lg"
          aria-busy={isSaving}
        >
          {isSaving ? (
            <>
              <LuLoader
                className="h-4 w-4 animate-spin mr-2"
                aria-hidden="true"
              />
              กำลังบันทึก
            </>
          ) : (
            <>
              <Check className="h-4 w-4 mr-2" aria-hidden="true" />
              บันทึกการตั้งค่า
            </>
          )}
        </Button>
      </div>

      <footer className="border-t pt-4 text-center text-sm text-muted-foreground">
        คุณสามารถเปลี่ยนตำแหน่งนี้ได้ในภายหลังในเมนูการตั้งค่า
      </footer>
    </div>
  );
}

export { SetupApplicationUI };
