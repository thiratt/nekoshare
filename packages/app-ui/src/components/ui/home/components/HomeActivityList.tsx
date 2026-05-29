import { LuClock, LuPause, LuPlay } from "react-icons/lu";

import { Button } from "@workspace/ui/components/button";
import { Progress } from "@workspace/ui/components/progress";

import type { HomeRecentItem, HomeTransfer } from "../constants";

export function HomeTransfers({ transfers }: { transfers: HomeTransfer[] }) {
	return (
		<section className="w-full">
			<div className="mb-2 flex items-center justify-between">
				<h2 className="text-sm font-medium text-muted-foreground">กำลังทำงาน</h2>

				<Button type="button" size="sm" variant="ghost">
					ดูทั้งหมด
				</Button>
			</div>

			<div className="space-y-2">
				{transfers.map((transfer) => {
					const Icon = transfer.icon;

					return (
						<div
							key={transfer.id}
							className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 transition-colors hover:bg-muted/30"
						>
							<Icon className="size-4 shrink-0 text-muted-foreground" />

							<div className="flex min-w-0 flex-1 flex-col gap-1.5">
								<div className="flex items-center gap-2 text-sm">
									<span className="truncate font-medium text-foreground">{transfer.name}</span>
									<span className="text-muted-foreground">-&gt;</span>
									<span className="text-muted-foreground">{transfer.target}</span>

									<span className="ml-auto text-xs text-muted-foreground">
										{transfer.status === "paused" ? "หยุดชั่วคราว" : `${transfer.progress}%`}
									</span>
								</div>

								<Progress value={transfer.progress} />
							</div>

							<Button variant="ghost" size="icon" className="shrink-0 rounded-full">
								{transfer.status === "paused" ? <LuPlay /> : <LuPause />}
							</Button>
						</div>
					);
				})}
			</div>
		</section>
	);
}

export function HomeRecentItems({ items }: { items: HomeRecentItem[] }) {
	return (
		<section className="w-full">
			<div className="mb-2 flex items-center justify-between">
				<h2 className="text-sm font-medium text-muted-foreground">ล่าสุด</h2>

				<Button type="button" size="sm" variant="ghost">
					ดูทั้งหมด
				</Button>
			</div>

			<div className="flex items-center gap-3">
				{items.map((item) => {
					const Icon = item.icon;

					return (
						<Button key={item.id} type="button" variant="outline">
							<Icon className="size-3.5 shrink-0 text-muted-foreground" />
							<span className="max-w-24 truncate text-foreground">{item.name}</span>
							<LuClock className="size-3 shrink-0 text-muted-foreground" />
							<span className="shrink-0 text-xs text-muted-foreground">{item.time}</span>
						</Button>
					);
				})}
			</div>
		</section>
	);
}
