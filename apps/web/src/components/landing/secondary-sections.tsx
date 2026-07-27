import { CTA } from "./cta";
import { Features } from "./features";
import { Footer } from "./footer";
import { HowItWorks } from "./how-it-works";
import { Platforms } from "./platforms";
import { Security } from "./security";

export function LandingSecondarySections({
  compact = false,
}: {
  compact?: boolean;
}) {
  return (
    <div className="[content-visibility:auto] [contain-intrinsic-size:1px_3200px]">
      <Features compact={compact} />
      <HowItWorks compact={compact} />
      <Platforms compact={compact} />
      <Security compact={compact} />
      <CTA compact={compact} />
      <Footer />
    </div>
  );
}

export default LandingSecondarySections;
