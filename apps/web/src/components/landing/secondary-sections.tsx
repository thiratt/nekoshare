import { CTA } from "./cta";
import { Features } from "./features";
import { Footer } from "./footer";
import { HowItWorks } from "./how-it-works";
import { Platforms } from "./platforms";
import { Security } from "./security";
import { Stats } from "./stats";

export function LandingSecondarySections({
  theme,
}: {
  theme: "light" | "dark" | "system";
}) {
  return (
    <div className="[content-visibility:auto] [contain-intrinsic-size:1px_3200px]">
      <Stats />
      <Features />
      <HowItWorks />
      <Platforms />
      <Security />
      <CTA />
      <Footer theme={theme} />
    </div>
  );
}

export default LandingSecondarySections;
