import { LuLoader } from "react-icons/lu";

import { Button } from "@workspace/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog";

interface GoogleAuthProgressDialogProps {
  onCancel: () => void;
  open: boolean;
}

export function GoogleAuthProgressDialog({
  onCancel,
  open,
}: GoogleAuthProgressDialogProps) {
  return (
    <Dialog open={open}>
      <DialogContent showCloseButton={false} className="max-w-sm">
        <DialogHeader className="items-center text-center">
          <div className="bg-muted text-foreground flex size-12 items-center justify-center rounded-full">
            <LuLoader className="size-5 animate-spin" />
          </div>
          <DialogTitle>ดำเนินการต่อด้วยบัญชี Google</DialogTitle>
          <DialogDescription className="space-y-1 text-center">
            <span className="block">
              กรุณาทำรายการต่อบนเบราว์เซอร์เพื่อเข้าสู่ระบบ
            </span>
            <span className="block">
              ระบบจะดำเนินการเข้าสู่ระบบให้โดยอัตโนมัติหลังจากทำรายการเสร็จสิ้น
            </span>
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
