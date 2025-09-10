import * as React from "react";
import { createFileRoute, useParams, Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  Calendar,
  User,
  MoreHorizontal,
  Edit,
  Trash2,
  AlertTriangle,
  Loader2,
  Clock,
  Mail,
  Activity,
  Settings,
  UserCheck,
} from "lucide-react";

import { Button } from "@workspace/ui/components/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@workspace/ui/components/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@workspace/ui/components/alert-dialog";
import { TooltipProvider } from "@workspace/ui/components/tooltip";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@workspace/ui/components/tab-animate";
import { Badge } from "@workspace/ui/components/badge";

interface Member {
  id: string;
  username: string;
  email: string;
  createdAt: string | Date;
  lastLoginAt?: string | Date;
  profileUrl: string;
  role?: string;
  status?: "active" | "inactive" | "suspended";
}

interface MemberDetailProps {
  member?: Member | null;
  loading?: boolean;
  error?: string | null;
  onEdit?: (member: Member) => void;
  onDelete?: (member: Member) => void;
  onRoleChange?: (member: Member, role: string) => void;
}

// Enhanced sample data
const sampleMember: Member = {
  id: "u_001",
  username: "kenadams",
  email: "ken99@example.com",
  createdAt: "2024-12-01T09:12:00Z",
  lastLoginAt: "2025-08-13T08:45:00Z",
  profileUrl: "",
  role: "member",
  status: "active",
};

// Utility functions
const formatDate = (date: string | Date): string => {
  const d = date instanceof Date ? date : new Date(date);
  return new Intl.DateTimeFormat("th-TH", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
};

const formatRelativeTime = (date: string | Date): string => {
  const d = date instanceof Date ? date : new Date(date);
  const now = new Date();
  const diffInMs = now.getTime() - d.getTime();
  const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

  if (diffInDays === 0) return "วันนี้";
  if (diffInDays === 1) return "เมื่อวาน";
  if (diffInDays < 7) return `${diffInDays} วันที่แล้ว`;
  if (diffInDays < 30) return `${Math.floor(diffInDays / 7)} สัปดาห์ที่แล้ว`;
  return formatDate(date);
};

const getInitials = (username: string): string => {
  return username.slice(0, 2).toUpperCase();
};

const getStatusBadge = (status?: string) => {
  switch (status) {
    case "active":
      return (
        <Badge
          variant="default"
          className="bg-green-100 text-green-800 hover:bg-green-100 border border-primary/30"
        >
          ใช้งานอยู่
        </Badge>
      );
    case "inactive":
      return <Badge variant="secondary">ไม่ได้ใช้งาน</Badge>;
    case "suspended":
      return <Badge variant="destructive">ถูกระงับ</Badge>;
    default:
      return <Badge variant="secondary">ไม่ระบุ</Badge>;
  }
};

// Enhanced Components
const MemberProfile: React.FC<{ member: Member }> = ({ member }) => (
  <Card className="overflow-hidden py-0 border-primary/50">
    <div className="bg-gradient-to-br from-primary/10 to-secondary/20 px-6 pt-6 pb-4 border-b border-primary/30">
      <div className="flex flex-col items-center text-center">
        <Avatar className="h-24 w-24 ring-2 ring-primary">
          <AvatarImage
            // src={member.profileUrl}
            src="https://github.com/shadcn.png"
            alt={`${member.username}'s avatar`}
            className="object-cover"
          />
          <AvatarFallback className="text-2xl font-semibold bg-primary/20">
            {getInitials(member.username)}
          </AvatarFallback>
        </Avatar>

        <div className="mt-4 space-y-2">
          <h1 className="text-2xl font-bold text-foreground">
            @{member.username}
          </h1>
          <div className="flex items-center gap-2 justify-center flex-wrap">
            {getStatusBadge(member.status)}
          </div>
        </div>
      </div>
    </div>

    <CardContent className="space-y-4">
      <div className="space-y-3">
        <div className="flex items-center gap-3 text-sm">
          <Mail className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          <span className="text-muted-foreground truncate">{member.email}</span>
        </div>

        <div className="flex items-center gap-3 text-sm">
          <Calendar className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          <span className="text-muted-foreground">
            เข้าร่วมเมื่อ {formatDate(member.createdAt)}
          </span>
        </div>

        {member.lastLoginAt && (
          <div className="flex items-center gap-3 text-sm">
            <Clock className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <span className="text-muted-foreground">
              เข้าใช้ล่าสุด {formatRelativeTime(member.lastLoginAt)}
            </span>
          </div>
        )}
      </div>
    </CardContent>
  </Card>
);

const ActionButtons: React.FC<{
  member: Member;
  onEdit?: (member: Member) => void;
  onDelete?: (member: Member) => void;
}> = ({ member, onEdit, onDelete }) => {
  const [showDeleteDialog, setShowDeleteDialog] = React.useState(false);

  return (
    <>
      <div className="flex gap-2">
        {onEdit && (
          <Button onClick={() => onEdit(member)} size="sm">
            <Edit className="h-4 w-4" />
            แก้ไข
          </Button>
        )}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-[200px]">
            <DropdownMenuLabel>ตัวเลือกเพิ่มเติม</DropdownMenuLabel>
            <DropdownMenuSeparator />

            <DropdownMenuItem>
              <UserCheck className="h-4 w-4" />
              เปลี่ยนสถานะ
            </DropdownMenuItem>

            {onDelete && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={() => setShowDeleteDialog(true)}
                >
                  <Trash2 className="h-4 w-4" />
                  ลบสมาชิกนี้
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Enhanced Delete confirmation dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              ยืนยันการลบสมาชิก
            </AlertDialogTitle>
            <AlertDialogDescription>
              คุณแน่ใจหรือไม่ที่จะลบสมาชิก <strong>@{member.username}</strong>?
              การดำเนินการนี้ไม่สามารถย้อนกลับได้
              และจะลบข้อมูลที่เกี่ยวข้องทั้งหมดอย่างถาวร
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                onDelete?.(member);
                setShowDeleteDialog(false);
              }}
            >
              ลบสมาชิก
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

const DeviceTab: React.FC = () => (
  <div className="space-y-4">
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Activity className="h-5 w-5" />
          อุปกรณ์ที่เข้าใช้งาน
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="space-y-1">
              <div className="font-medium">Chrome บน Windows</div>
              <div className="text-sm text-muted-foreground">
                OS: Website บน Chrome 139
              </div>
              <div className="text-sm text-muted-foreground">
                เข้าใช้ล่าสุด: 2 ชั่วโมงที่แล้ว
              </div>
            </div>
            <Button variant="destructive">
              <Trash2 />
            </Button>
          </div>

          <div className="flex items-start justify-between p-4 border rounded-lg">
            <div className="space-y-1">
              <div className="font-medium">PC-HOME</div>
              <div className="text-sm text-muted-foreground">OS: Windows</div>
              <div className="text-sm text-muted-foreground">
                เข้าใช้ล่าสุด: 1 วันที่แล้ว
              </div>
            </div>
            <Button variant="destructive">
              <Trash2 />
            </Button>
          </div>

          <div className="flex items-start justify-between p-4 border rounded-lg">
            <div className="space-y-1">
              <div className="font-medium">23021RAAEG</div>
              <div className="text-sm text-muted-foreground">OS: Android</div>
              <div className="text-sm text-muted-foreground">
                เข้าใช้ล่าสุด: 3 วันที่แล้ว
              </div>
            </div>
            <Button variant="destructive">
              <Trash2 />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  </div>
);

const ContentTab: React.FC = () => (
  <div className="space-y-4">
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            โอนถ่ายข้อมูลทั้งหมด
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">2GB</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            เพื่อน
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">2 คน</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            อุปกรณ์
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">8 อุปกรณ์</div>
        </CardContent>
      </Card>
    </div>

    <Card>
      <CardHeader>
        <CardTitle className="text-lg">กิจกรรมล่าสุด</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex items-start gap-3 pb-3 border-b">
            <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0"></div>
            <div className="space-y-1">
              <div className="text-sm font-medium">
                สร้างลิงก์สาธารณะสำหรับ{" "}
                <span className="font-bold">secret.zip</span>
              </div>
              <div className="text-xs text-muted-foreground">
                2 ชั่วโมงที่แล้ว
              </div>
            </div>
          </div>

          <div className="flex items-start gap-3 pb-3 border-b">
            <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0"></div>
            <div className="space-y-1">
              <div className="text-sm font-medium">
                อัปโหลด <span className="font-bold">secret.zip</span>
              </div>
              <div className="text-xs text-muted-foreground">
                5 ชั่วโมงที่แล้ว
              </div>
            </div>
          </div>

          <div className="flex items-start gap-3 pb-3 border-b">
            <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0"></div>
            <div className="space-y-1">
              <div className="text-sm font-medium">
                ดาวน์โหลด <span className="font-bold">untitled.txt</span>
              </div>
              <div className="text-xs text-muted-foreground">
                9 ชั่วโมงที่แล้ว
              </div>
            </div>
          </div>

          {/* <div className="flex items-start gap-3">
            <div className="w-2 h-2 bg-muted rounded-full mt-2 flex-shrink-0"></div>
            <div className="space-y-1">
              <div className="text-sm font-medium">เข้าใช้งานระบบ</div>
              <div className="text-xs text-muted-foreground">1 วันที่แล้ว</div>
            </div>
          </div> */}
        </div>
      </CardContent>
    </Card>
  </div>
);

const MemberDetail: React.FC<MemberDetailProps> = ({
  member,
  loading = false,
  error = null,
  onEdit,
  onDelete,
}) => {
  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center space-y-4">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
            <p className="text-sm text-muted-foreground">
              กำลังโหลดข้อมูลสมาชิก...
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <Card>
          <CardContent className="flex items-center justify-center p-8">
            <div className="text-center space-y-4">
              <AlertTriangle className="mx-auto h-8 w-8 text-destructive" />
              <div>
                <h3 className="font-semibold text-foreground mb-1">
                  เกิดข้อผิดพลาด
                </h3>
                <p className="text-sm text-muted-foreground">{error}</p>
              </div>
              <Button variant="outline" asChild>
                <Link to="..">
                  <ArrowLeft className="h-4 w-4" />
                  กลับไปหน้าก่อนหน้า
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!member) {
    return (
      <div className="space-y-4">
        <Button variant="outline" asChild>
          <Link to="..">
            <ArrowLeft className="h-4 w-4" />
            กลับ
          </Link>
        </Button>
        <Card className="h-[calc(100vh-12rem)]">
          <CardContent className="flex-1 flex items-center justify-center p-8">
            <div className="text-center space-y-4">
              <User className="mx-auto h-12 w-12 text-muted-foreground" />
              <div>
                <h3 className="font-semibold text-foreground mb-1">
                  ไม่พบสมาชิก
                </h3>
                <p className="text-sm text-muted-foreground">
                  ไม่มีข้อมูลสมาชิกที่คุณต้องการดู
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Navigation Header */}
      <div className="flex items-center justify-between">
        <Button variant="outline" asChild>
          <Link to="..">
            <ArrowLeft className="h-4 w-4" />
            กลับ
          </Link>
        </Button>
        <ActionButtons member={member} onEdit={onEdit} onDelete={onDelete} />
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-[350px_1fr] gap-6">
        {/* Profile Sidebar */}
        <MemberProfile member={member} />

        {/* Content Area */}
        <div className="space-y-6">
          <Tabs defaultValue="content" className="w-full">
            <TabsList>
              <TabsTrigger value="content" className="flex items-center gap-2">
                <Activity />
                กิจกรรมและข้อมูล
              </TabsTrigger>
              <TabsTrigger value="device" className="flex items-center gap-2">
                <Settings />
                อุปกรณ์และเซสชัน
              </TabsTrigger>
            </TabsList>

            <TabsContent value="content">
              <ContentTab />
            </TabsContent>
            <TabsContent value="device">
              <DeviceTab />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

// Route component
export const Route = createFileRoute("/home/members/$memberId")({
  component: RouteComponent,
});

function RouteComponent() {
  const { memberId } = useParams({ from: Route.id });

  // In a real app, you would fetch the member data here
  // const { data: member, loading, error } = useMember(memberId);

  // For demo purposes, we'll use sample data
  const member = memberId === sampleMember.id ? sampleMember : null;

  const handleEdit = (member: Member) => {
    console.log("Edit member:", member);
    // Navigate to edit page or open edit modal
  };

  const handleDelete = (member: Member) => {
    console.log("Delete member:", member);
    // Handle delete logic
  };

  return (
    <TooltipProvider>
      <MemberDetail
        member={member}
        loading={false}
        error={null}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />
    </TooltipProvider>
  );
}
