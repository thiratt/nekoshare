// src/routes/share/$index.tsx
import * as React from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@workspace/ui/components/card";
import { Button } from "@workspace/ui/components/button";
import { Badge } from "@workspace/ui/components/badge";
import { Progress } from "@workspace/ui/components/progress";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@workspace/ui/components/tooltip";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { cn } from "@workspace/ui/lib/utils";
import {
  Download,
  Link as LinkIcon,
  HardDrive,
  CalendarClock,
  Shield,
  Hash,
  Clock,
  Copy,
  AlertCircle,
  FileText,
  File,
  CheckCircle,
  Share2,
} from "lucide-react";

// ---------- Router ----------
export const Route = createFileRoute("/share/$index")({
  component: RouteComponent,
});

// ---------- Types ----------
type PublicMeta = {
  id: string;
  name: string;
  type: "file" | "text";
  size: number;
  uploadedAt: string;
  expiresAt: string; // ISO date - now included in API response
  checksum: string;
  algorithm: "AES-256-GCM";
  downloadUrl: string;
  isExpired: boolean; // Server-calculated
};

type LoadingState = "idle" | "loading" | "success" | "error";

// ---------- Utils ----------
const formatBytes = (bytes: number): string => {
  if (!Number.isFinite(bytes) || bytes === 0) return "0 B";

  const units = ["B", "KB", "MB", "GB", "TB"];
  const base = 1024;
  const unitIndex = Math.floor(Math.log(bytes) / Math.log(base));
  const size = bytes / Math.pow(base, unitIndex);

  return `${size < 10 && unitIndex > 0 ? size.toFixed(1) : Math.round(size)} ${units[unitIndex]}`;
};

const formatDate = (dateString?: string): string => {
  if (!dateString) return "-";

  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);

    if (diffHours < 1) return "Just now";
    if (diffHours < 24) return `${Math.floor(diffHours)} hours ago`;
    if (diffHours < 48) return "Yesterday";

    return new Intl.DateTimeFormat("en-US", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(date);
  } catch {
    return dateString;
  }
};

const formatTimeRemaining = (ms: number): string => {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const days = Math.floor(totalSeconds / (24 * 3600));
  const hours = Math.floor((totalSeconds % (24 * 3600)) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
};

const getFileIcon = (type: "file" | "text", name: string) => {
  if (type === "text") return FileText;

  const ext = name.split(".").pop()?.toLowerCase();

  // You can expand this with more specific icons based on file extensions
  const iconMap: Record<string, typeof File> = {
    pdf: File,
    doc: FileText,
    docx: FileText,
    txt: FileText,
    // Add more as needed
  };

  return iconMap[ext || ""] || File;
};

// ---------- API ----------
async function fetchPublicContent(shareId: string): Promise<PublicMeta> {
  // In real implementation:
  // const response = await fetch(`/api/share/${shareId}`);
  // if (!response.ok) throw new Error(response.statusText);
  // return response.json();

  await new Promise((r) => setTimeout(r, 450));

  // Mock different scenarios based on shareId
  if (shareId === "expired") {
    return {
      id: shareId,
      name: "expired-document.pdf",
      type: "file",
      size: 1_572_864,
      uploadedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days ago
      expiresAt: new Date(Date.now() - 1000).toISOString(), // 1 second ago
      checksum:
        "8b1a9953c4611296a827abf8c47804d7c6ad1a2f3e4b5c6d7e8f9a0b1c2d3e4f",
      algorithm: "AES-256-GCM",
      downloadUrl: `/api/share/${shareId}/download`,
      isExpired: true,
    };
  }

  if (shareId === "error") {
    throw new Error("Share not found or access denied");
  }

  return {
    id: shareId,
    name: "important-document.pdf",
    type: "file",
    size: 1_572_864,
    uploadedAt: new Date(Date.now() - 3600_000).toISOString(), // 1 hour ago
    expiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(), // 2 hours from now
    checksum:
      "8b1a9953c4611296a827abf8c47804d7c6ad1a2f3e4b5c6d7e8f9a0b1c2d3e4f",
    algorithm: "AES-256-GCM",
    downloadUrl: `/api/share/${shareId}/download`,
    isExpired: false,
  };
}

// ---------- Custom Hooks ----------
const useCountdown = (expiresAt: string) => {
  const [timeLeft, setTimeLeft] = React.useState(() => {
    try {
      return Math.max(0, new Date(expiresAt).getTime() - Date.now());
    } catch {
      return 0;
    }
  });

  React.useEffect(() => {
    if (!expiresAt) return;

    const interval = setInterval(() => {
      try {
        const remaining = Math.max(
          0,
          new Date(expiresAt).getTime() - Date.now(),
        );
        setTimeLeft(remaining);

        if (remaining === 0) {
          clearInterval(interval);
        }
      } catch {
        clearInterval(interval);
        setTimeLeft(0);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [expiresAt]);

  const isExpired = timeLeft === 0;
  const progress = React.useMemo(() => {
    if (!expiresAt) return 100;

    try {
      const expiryTime = new Date(expiresAt).getTime();
      const totalDuration = 24 * 60 * 60 * 1000; // Assume 24h total duration for progress
      const elapsed = totalDuration - timeLeft;
      return Math.max(0, Math.min(100, (elapsed / totalDuration) * 100));
    } catch {
      return 100;
    }
  }, [timeLeft, expiresAt]);

  return { timeLeft, isExpired, progress };
};

const useCopyToClipboard = () => {
  const [copied, setCopied] = React.useState(false);

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("Failed to copy:", error);
      // Fallback for older browsers
      const textArea = document.createElement("textarea");
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return { copy, copied };
};

// ---------- Components ----------
const LoadingSkeleton = () => (
  <div className="space-y-4">
    <div className="flex items-center gap-3">
      <Skeleton className="h-10 w-10 rounded-lg" />
      <div className="space-y-2 flex-1">
        <Skeleton className="h-5 w-48" />
        <Skeleton className="h-4 w-32" />
      </div>
    </div>
    <Skeleton className="h-10 w-full rounded-lg" />
    <div className="space-y-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="flex items-center justify-between">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-32" />
        </div>
      ))}
    </div>
  </div>
);

const ErrorState = ({
  error,
  onRetry,
}: {
  error: string;
  onRetry: () => void;
}) => (
  <div className="text-center py-12">
    <div className="mx-auto w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mb-4">
      <AlertCircle className="w-8 h-8 text-destructive" />
    </div>
    <h3 className="text-lg font-semibold mb-2">Unable to load content</h3>
    <p className="text-muted-foreground mb-6 max-w-sm mx-auto">{error}</p>
    <Button onClick={onRetry} variant="outline" className="gap-2">
      <Clock className="w-4 h-4" />
      Try again
    </Button>
  </div>
);

const ExpirationBanner = ({
  timeLeft,
  isExpired,
  progress,
  expiresAt,
}: {
  timeLeft: number;
  isExpired: boolean;
  progress: number;
  expiresAt: string;
}) => {
  const isUrgent = timeLeft < 30 * 60 * 1000; // 30 minutes
  const expiryDate = new Date(expiresAt);

  return (
    <div
      className={cn(
        "rounded-xl border p-4 transition-all duration-200",
        isExpired
          ? "bg-destructive/5 border-destructive/20"
          : isUrgent
            ? "bg-orange-50 border-orange-200 dark:bg-orange-950/20 dark:border-orange-800/20"
            : "bg-blue-50 border-blue-200 dark:bg-blue-950/20 dark:border-blue-800/20",
      )}
    >
      <div className="flex items-start gap-3 mb-3">
        <div
          className={cn(
            "p-2 rounded-lg",
            isExpired
              ? "bg-destructive/10 text-destructive"
              : isUrgent
                ? "bg-orange-100 text-orange-600 dark:bg-orange-900/20 dark:text-orange-400"
                : "bg-blue-100 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400",
          )}
        >
          <Clock className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm">
            {isExpired
              ? "Link expired"
              : isUrgent
                ? "Expires soon"
                : "ใช้งานได้จนถึง"}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {isExpired
              ? `Expired ${formatDate(expiresAt)}`
              : `${formatTimeRemaining(timeLeft)}`}
          </p>
        </div>
      </div>

      {!isExpired && (
        <div className="space-y-2">
          <Progress
            value={progress}
            className={cn(
              "h-2",
              isUrgent ? "[&>div]:bg-orange-500" : "[&>div]:bg-blue-500",
            )}
          />
          <p className="text-xs text-muted-foreground">
            หมดอายุเมื่อ {expiryDate.toLocaleString("th-TH")}
          </p>
        </div>
      )}
    </div>
  );
};

const MetadataGrid = ({ meta }: { meta: PublicMeta }) => {
  const FileIcon = getFileIcon(meta.type, meta.name);

  const metadata = [
    {
      icon: HardDrive,
      label: "File size",
      value: formatBytes(meta.size),
    },
    {
      icon: CalendarClock,
      label: "อัปโหลดเมื่อ",
      // value: formatDate(meta.uploadedAt),
      value: "1 ชั่วโมงที่แล้ว",
    },
    // {
    //   icon: Shield,
    //   label: "Encryption",
    //   value: meta.algorithm,
    // },
    {
      icon: Hash,
      label: "Checksum",
      value: meta.checksum,
      className: "font-mono text-xs",
      truncate: true,
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4 rounded-xl">
        <div className="p-3 rounded-xl bg-primary/10">
          <FileIcon className="w-6 h-6 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold truncate text-lg">{meta.name}</h3>
          <p className="text-sm text-muted-foreground capitalize">
            {meta.type} • {formatBytes(meta.size)}
          </p>
        </div>
      </div>

      <div className="grid">
        {metadata.slice(1).map((item, index) => (
          <div key={index} className="flex items-center gap-3 py-2">
            <item.icon className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            <span className="text-sm text-muted-foreground min-w-0 flex-1">
              {item.label}
            </span>
            <span
              className={cn(
                "text-sm font-medium",
                item.className,
                item.truncate && "truncate max-w-[180px]",
              )}
            >
              {item.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

// ---------- Main Component ----------
function RouteComponent() {
  const navigate = useNavigate();
  const { index: shareId } = Route.useParams();

  const [meta, setMeta] = React.useState<PublicMeta | null>(null);
  const [loadingState, setLoadingState] =
    React.useState<LoadingState>("loading");
  const [error, setError] = React.useState<string | null>(null);

  const { timeLeft, isExpired, progress } = useCountdown(meta?.expiresAt || "");
  const { copy, copied } = useCopyToClipboard();

  const shareUrl = React.useMemo(() => window.location.href, []);

  const fetchContent = React.useCallback(async () => {
    try {
      setLoadingState("loading");
      setError(null);

      const data = await fetchPublicContent(shareId);
      setMeta(data);
      setLoadingState("success");
    } catch (e: any) {
      setError(e?.message || "Failed to load shared content");
      setLoadingState("error");
    }
  }, [shareId]);

  React.useEffect(() => {
    fetchContent();
  }, [fetchContent]);

  const handleDownload = () => {
    if (!meta?.downloadUrl || meta.isExpired) return;

    const link = document.createElement("a");
    link.href = meta.downloadUrl;
    link.download = meta.name || "download";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const canDownload =
    meta?.downloadUrl && !meta?.isExpired && loadingState === "success";
  const showExpiration = meta?.expiresAt && !meta?.isExpired;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/10 flex items-center justify-center p-4">
      <Card className="w-full max-w-xl shadow-xl border-0 bg-card/80 backdrop-blur">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-2">
            <Share2 className="w-8 h-8 text-primary" />
          </div>

          <CardTitle className="text-2xl flex items-center justify-center gap-2">
            Flash Share
            <Badge
              variant={meta?.isExpired ? "destructive" : "default"}
              className="text-xs"
            >
              {meta?.isExpired ? "Expired" : "ใช้งานได้"}
            </Badge>
          </CardTitle>

          {/* <CardDescription className="text-base max-w-sm mx-auto">
            {meta?.isExpired
              ? "This shared content is no longer available"
              : "Securely download shared content"}
          </CardDescription> */}
        </CardHeader>

        <CardContent className="space-y-6">
          {showExpiration && (
            <ExpirationBanner
              timeLeft={timeLeft}
              isExpired={isExpired}
              progress={progress}
              expiresAt={meta.expiresAt}
            />
          )}

          <div className="rounded-xl border bg-card/50">
            <div className="p-4">
              {loadingState === "loading" && <LoadingSkeleton />}
              {loadingState === "error" && (
                <ErrorState error={error!} onRetry={fetchContent} />
              )}
              {loadingState === "success" && meta && (
                <MetadataGrid meta={meta} />
              )}
            </div>
          </div>

          {meta?.isExpired && (
            <div className="text-center p-6 rounded-xl bg-muted/30">
              <div className="mx-auto w-12 h-12 bg-muted rounded-full flex items-center justify-center mb-3">
                <Clock className="w-6 h-6 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                This share link has expired. Please contact the sender for a new
                link.
              </p>
              <Button variant="outline" onClick={() => navigate({ to: "/" })}>
                Back to Home
              </Button>
            </div>
          )}
        </CardContent>

        <CardFooter className="flex">
          <Button
            onClick={handleDownload}
            disabled={!canDownload}
            className="flex-1"
          >
            <Download />
            ดาวน์โหลด
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
