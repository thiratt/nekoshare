import * as React from "react";
import {
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogDescription,
	DialogFooter,
} from "@workspace/ui/components/dialog";
import { Button } from "@workspace/ui/components/button";
import { Label } from "@workspace/ui/components/label";
import { Input } from "@workspace/ui/components/input";
import { RadioGroup, RadioGroupItem } from "@workspace/ui/components/radio-group";
import { Separator } from "@workspace/ui/components/separator";
import { Badge } from "@workspace/ui/components/badge";
import { Share2, Clock, AlertTriangle, Info, Globe, Timer, Calendar, Zap, Loader2 } from "lucide-react";

type TimeUnit = "minutes" | "hours" | "days";

interface TimePreset {
	value: number;
	unit: TimeUnit;
	label: string;
	description: string;
	icon: React.ComponentType<{ className?: string }>;
	popular?: boolean;
}

const TIME_PRESETS: TimePreset[] = [
	{
		value: 5,
		unit: "minutes",
		label: "5 นาที",
		description: "แชร์แบบรวดเร็ว",
		icon: Zap,
		popular: true,
	},
	{
		value: 30,
		unit: "minutes",
		label: "30 นาที",
		description: "การนำเสนอแบบสั้น",
		icon: Timer,
		popular: true,
	},
	{
		value: 2,
		unit: "hours",
		label: "2 ชั่วโมง",
		description: "การประชุมหรือเวิร์กชอป",
		icon: Clock,
	},
	{
		value: 1,
		unit: "days",
		label: "1 วัน",
		description: "การเข้าถึงทั้งวัน",
		icon: Calendar,
	},
	// {
	// 	value: 7,
	// 	unit: "days",
	// 	label: "1 week",
	// 	description: "Long-term sharing",
	// 	icon: Calendar,
	// },
];

export function PublishDialog({
	onConfirm,
	onClose,
}: {
	onConfirm: (ttlSeconds: number) => Promise<void> | void;
	onClose: () => void;
}) {
	const [selectedPreset, setSelectedPreset] = React.useState<string>("30-minutes");
	const [customValue, setCustomValue] = React.useState(30);
	const [customUnit, setCustomUnit] = React.useState<TimeUnit>("minutes");
	const [useCustom, setUseCustom] = React.useState(false);
	const [busy, setBusy] = React.useState(false);

	// Convert time to seconds
	const getSecondsFromTime = React.useCallback((value: number, unit: TimeUnit): number => {
		const multipliers = {
			minutes: 60,
			hours: 60 * 60,
			days: 60 * 60 * 24,
		};
		return value * multipliers[unit];
	}, []);

	// Get current TTL in seconds
	const currentTTLSeconds = React.useMemo(() => {
		if (useCustom) {
			return getSecondsFromTime(customValue, customUnit);
		}

		const preset = TIME_PRESETS.find((p) => `${p.value}-${p.unit}` === selectedPreset);
		return preset ? getSecondsFromTime(preset.value, preset.unit) : getSecondsFromTime(30, "minutes");
	}, [useCustom, customValue, customUnit, selectedPreset, getSecondsFromTime]);

	// Format expiry time for display
	const formatExpiryTime = React.useCallback((seconds: number): string => {
		const now = new Date();
		const expiry = new Date(now.getTime() + seconds * 1000);

		const today = now.toDateString();
		const expiryDate = expiry.toDateString();

		if (today === expiryDate) {
			return `วันนี้ เมื่อ ${expiry.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
		} else {
			return `ในวันที่ ${expiry.toLocaleDateString()} เมื่อ ${expiry.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
		}
	}, []);

	const handleConfirm = async () => {
		setBusy(true);
		try {
			await onConfirm(currentTTLSeconds);
			onClose();
		} catch (error) {
			console.error("Failed to publish:", error);
			setBusy(false);
		}
	};

	const handleCustomValueChange = (value: string) => {
		const num = parseInt(value) || 1;
		const maxValues = { minutes: 1440, hours: 24, days: 1 }; // Max: 24h in mins, 7d in hours, 30 days
		setCustomValue(Math.min(maxValues[customUnit], Math.max(1, num)));
	};

	const getUnitLimits = (unit: TimeUnit) => {
		switch (unit) {
			case "minutes":
				return { min: 1, max: 1440, step: 1 };
			case "hours":
				return { min: 1, max: 168, step: 1 };
			case "days":
				return { min: 1, max: 30, step: 1 };
		}
	};

	return (
		<DialogContent className="sm:max-w-[800px]">
			<DialogHeader>
				<DialogTitle className="flex items-center gap-2">
					<Share2 className="w-5 h-5" />
					เผยแพร่ข้อมูล
				</DialogTitle>
				<DialogDescription>สร้างลิงก์สาธารณะเพื่อให้ทุกคนสามารถเข้าถึงได้</DialogDescription>
			</DialogHeader>

			<div className="space-y-6">
				{/* Warning Notice */}
				<div className="flex items-start gap-3 p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg">
					<AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
					<div className="space-y-1">
						<p className="text-sm font-medium text-amber-800 dark:text-amber-200">
							การกระทำที่ไม่สามารถย้อนกลับได้
						</p>
						<p className="text-sm text-amber-700 dark:text-amber-300">
							เมื่อเผยแพร่แล้ว
							เนื้อหาจะสามารถเข้าถึงได้โดยสาธารณะและไม่สามารถตั้งค่าให้เป็นส่วนตัวอีกต่อไป
						</p>
					</div>
				</div>

				{/* Time Selection */}
				<div className="space-y-4">
					<div className="space-y-3">
						<Label className="text-base font-medium flex items-center gap-2">
							<Clock className="w-4 h-4" />
							ระยะเวลาหมดอายุของข้อมูล
						</Label>

						{/* Quick Presets */}
						<div className="space-y-2">
							<Label className="text-sm text-muted-foreground">ตัวเลือก</Label>
							<div className="grid grid-cols-2 gap-2">
								{TIME_PRESETS.map((preset) => {
									const presetId = `${preset.value}-${preset.unit}`;
									const isSelected = !useCustom && selectedPreset === presetId;
									const IconComponent = preset.icon;

									return (
										<button
											key={presetId}
											type="button"
											onClick={() => {
												setSelectedPreset(presetId);
												setUseCustom(false);
											}}
											className={`
												relative p-3 text-left border rounded-lg transition-all hover:shadow-sm
												${isSelected ? "border-primary bg-primary/5 shadow-sm" : "border-border hover:border-primary/50"}
											`}
										>
											<div className="flex items-start justify-between">
												<div className="space-y-1">
													<div className="flex items-center gap-2">
														<IconComponent className="w-4 h-4 text-muted-foreground" />
														<span className="font-medium text-sm">{preset.label}</span>
														{preset.popular && (
															<Badge variant="secondary" className="text-xs px-1.5 py-0">
																นิยม
															</Badge>
														)}
													</div>
													<p className="text-xs text-muted-foreground">
														{preset.description}
													</p>
												</div>
											</div>
										</button>
									);
								})}
							</div>
						</div>

						<Separator />

						{/* Custom Time */}
						<div className="space-y-3">
							<div className="flex items-center gap-2">
								<input
									type="radio"
									id="custom-time"
									checked={useCustom}
									onChange={(e) => setUseCustom(e.target.checked)}
									className="w-4 h-4"
								/>
								<Label htmlFor="custom-time" className="text-sm font-medium">
									กำหนดเอง
								</Label>
							</div>

							{useCustom && (
								<div className="ml-6 space-y-3 p-3 border rounded-lg bg-muted/30">
									<div className="flex items-center gap-3">
										<div className="flex-1">
											<Input
												type="number"
												value={customValue}
												onChange={(e) => handleCustomValueChange(e.target.value)}
												min={getUnitLimits(customUnit).min}
												max={getUnitLimits(customUnit).max}
												step={getUnitLimits(customUnit).step}
												className="w-full"
											/>
										</div>
										<RadioGroup
											value={customUnit}
											onValueChange={(value: TimeUnit) => setCustomUnit(value)}
											className="flex gap-4"
										>
											<div className="flex items-center space-x-2">
												<RadioGroupItem value="minutes" id="minutes" />
												<Label htmlFor="minutes" className="text-sm">
													นาที
												</Label>
											</div>
											<div className="flex items-center space-x-2">
												<RadioGroupItem value="hours" id="hours" />
												<Label htmlFor="hours" className="text-sm">
													ชั่วโมง
												</Label>
											</div>
											{/* <div className="flex items-center space-x-2">
												<RadioGroupItem value="days" id="days" />
												<Label htmlFor="days" className="text-sm">
													Days
												</Label>
											</div> */}
										</RadioGroup>
									</div>
								</div>
							)}
						</div>
					</div>
				</div>

				{/* Summary */}
				<div className="p-4 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg">
					<div className="flex items-start gap-3">
						<Info className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
						<div className="space-y-2">
							<div className="flex items-center gap-2">
								<Globe className="w-4 h-4 text-blue-600 dark:text-blue-400" />
								<span className="text-sm font-medium text-blue-800 dark:text-blue-200">
									ลิงก์จะหมดอายุ {formatExpiryTime(currentTTLSeconds)}
								</span>
							</div>
							<p className="text-sm text-blue-700 dark:text-blue-300">
								หลังจากหมดอายุ ลิงก์สาธารณะจะไม่สามารถใช้งานได้อีก และไม่สามารถเข้าถึงเนื้อหาได้
							</p>
						</div>
					</div>
				</div>
			</div>

			<DialogFooter className="flex items-center justify-between">
				<div className="text-sm text-muted-foreground">
					อีก{" "}
					{currentTTLSeconds < 3600
						? `${Math.round(currentTTLSeconds / 60)} นาที${Math.round(currentTTLSeconds / 60) !== 1 ? "" : ""}`
						: currentTTLSeconds < 86400
							? `${Math.round(currentTTLSeconds / 3600)} ชั่วโมง${Math.round(currentTTLSeconds / 3600) !== 1 ? "" : ""}`
							: `${Math.round(currentTTLSeconds / 86400)} วัน${Math.round(currentTTLSeconds / 86400) !== 1 ? "" : ""}`}
					จากตอนนี้
				</div>
				<div className="flex gap-2">
					<Button variant="outline" onClick={onClose} disabled={busy}>
						ยกเลิก
					</Button>
					<Button onClick={handleConfirm} disabled={busy}>
						{busy ? (
							<>
								<Loader2 className="w-4 h-4 mr-2 animate-spin" />
								Publishing...
							</>
						) : (
							<>
								<Share2 className="w-4 h-4 mr-2" />
								เผยแพร่ลิงก์
							</>
						)}
					</Button>
				</div>
			</DialogFooter>
		</DialogContent>
	);
}
