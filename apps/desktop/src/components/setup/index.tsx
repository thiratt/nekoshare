import { useCallback, useEffect, useMemo, useState } from "react";

import { documentDir, join } from "@tauri-apps/api/path";
import { open } from "@tauri-apps/plugin-dialog";
import { exists, mkdir } from "@tauri-apps/plugin-fs";
import { Check, FolderOpen } from "lucide-react";
import { LuLoader, LuX } from "react-icons/lu";

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
  const { set: saveToStore } = useStore();

  const [defaultDocPath, setDefaultDocPath] = useState<string>("");
  const [selectedPath, setSelectedPath] = useState<string>("");
  const [createSubfolder, setCreateSubfolder] = useState(true);
  const [finalPath, setFinalPath] = useState<string>("");

  const [isInitializing, setIsInitializing] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const init = async () => {
      try {
        const docDir = await documentDir();
        setDefaultDocPath(docDir);
        setSelectedPath(docDir);
      } catch {
        setError("ไม่สามารถเข้าถึงโฟลเดอร์ Documents ได้");
      } finally {
        setIsInitializing(false);
      }
    };
    init();
  }, []);

  useEffect(() => {
    if (!selectedPath) return;

    const updateFinalPath = async () => {
      const path = createSubfolder
        ? await join(selectedPath, FOLDER_NAME)
        : selectedPath;
      setFinalPath(path);
    };
    updateFinalPath();
  }, [selectedPath, createSubfolder]);

  const isDefault = useMemo(() => {
    return selectedPath === defaultDocPath && createSubfolder;
  }, [defaultDocPath, selectedPath, createSubfolder]);

  const handleSelectFolder = useCallback(async () => {
    try {
      const selected = await open({
        directory: true,
        multiple: false,
        title: DIALOG_TITLE,
        defaultPath: selectedPath || defaultDocPath,
      });

      if (selected && typeof selected === "string") {
        setSelectedPath(selected);
        setCreateSubfolder(
          !selected.toLowerCase().endsWith(FOLDER_NAME.toLowerCase()),
        );
      }
    } catch {
      setError("เกิดข้อผิดพลาดในการเลือกโฟลเดอร์");
    }
  }, [selectedPath, defaultDocPath]);

  const handleSaveSettings = async () => {
    if (!finalPath) return;
    setIsSaving(true);
    setError(null);

    try {
      if (!(await exists(finalPath))) {
        await mkdir(finalPath, { recursive: true });
      }

      await saveToStore("appConfig", {
        isSetup: true,
        fileLocation: finalPath,
      });

      onSetupComplete?.();
    } catch {
      setError("ไม่สามารถบันทึกการตั้งค่าได้");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="w-full max-w-2xl space-y-8 rounded-lg border bg-card p-8 shadow-lg">
      <header className="space-y-2 text-center">
        <h1 className="text-3xl font-bold tracking-tight">
          ยินดีต้อนรับสู่ Nekoshare
        </h1>
        <p className="text-muted-foreground">
          ตั้งค่าตำแหน่งบันทึกไฟล์ที่คุณได้รับ
        </p>
      </header>

      <div className="space-y-6">
        <FieldSet>
          <FieldGroup>
            <Field>
              <FieldLabel>ตำแหน่งบันทึกเริ่มต้น</FieldLabel>
              <div className="flex gap-2">
                <Input
                  value={finalPath}
                  placeholder={
                    isInitializing ? "กำลังโหลด..." : "เลือกโฟลเดอร์..."
                  }
                  className="flex-1 pointer-events-none truncate bg-muted/50"
                  readOnly
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleSelectFolder}
                  disabled={isSaving}
                >
                  <FolderOpen className="h-4 w-4" />
                </Button>
                <AnimatedContainer show={!isDefault}>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => {
                      setSelectedPath(defaultDocPath);
                      setCreateSubfolder(true);
                    }}
                  >
                    <LuX className="h-4 w-4" />
                  </Button>
                </AnimatedContainer>
              </div>

              <FieldDescription>
                ไฟล์จะถูกบันทึกที่:{" "}
                <span className="font-mono text-xs break-all text-primary">
                  {finalPath}
                </span>
              </FieldDescription>

              <Field orientation="horizontal" className="mt-4">
                <Switch
                  id="create-new-folder"
                  checked={createSubfolder}
                  onCheckedChange={setCreateSubfolder}
                  disabled={isSaving}
                />
                <FieldLabel
                  htmlFor="create-new-folder"
                  className="cursor-pointer"
                >
                  สร้างโฟลเดอร์ <span className="font-bold">{FOLDER_NAME}</span>{" "}
                  อัตโนมัติ
                </FieldLabel>
              </Field>
            </Field>
          </FieldGroup>
        </FieldSet>

        {error && (
          <div className="p-3 text-sm rounded bg-destructive/10 text-destructive">
            {error}
          </div>
        )}

        <Button
          onClick={handleSaveSettings}
          disabled={!finalPath || isSaving}
          className="w-full"
          size="lg"
        >
          {isSaving ? (
            <LuLoader className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <Check className="h-4 w-4 mr-2" />
          )}
          เริ่มใช้งาน Nekoshare
        </Button>
      </div>
    </div>
  );
}

export { SetupApplicationUI };
