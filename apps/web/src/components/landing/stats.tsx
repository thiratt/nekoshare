import { motion } from "@workspace/app-ui/components/provide-animate";

const stats = [
  {
    value: "Direct",
    label: "To your devices",
    company: "or share with friends",
  },
  {
    value: "Simple",
    label: "Less friction",
    company: "from send to receive",
  },
  {
    value: "Private",
    label: "Encrypted transfer",
    company: "built to feel safe",
  },
  {
    value: "Open",
    label: "Self-hostable",
    company: "run it your way",
  },
];

export function Stats() {
  return (
    <section className="border-y border-border bg-muted/25 py-5 md:py-6">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 gap-px overflow-hidden rounded-4xl border border-border bg-background/75 backdrop-blur-sm lg:grid-cols-4">
          {stats.map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              viewport={{ once: true }}
              className="bg-background/60 p-8 text-center lg:p-10"
            >
              <div className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
                {stat.value}
              </div>
              <div className="mt-2 text-sm text-muted-foreground">
                {stat.label}
              </div>
              <div className="mt-1 text-xs text-muted-foreground/80">
                {stat.company}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
