import { StaticPage } from "./ManifestComponents";

export const AboutPage = ({ onBack }) => (
  <StaticPage title="About us" onBack={onBack}>
    <p>
      Tuuraa is a managed last-mile logistics partner for growing businesses in
      Lagos. We run the logistics, so you can run the business.
    </p>
    <p>
      From dedicated riders to structured delivery windows, we help SMEs deliver
      reliably without building an in-house logistics team.
    </p>
    <p>
      We work with businesses across food, beauty, retail, and other fast-moving
      categories — assigning a rider and coordinator to each account, and giving
      owners visibility into every drop from pickup to delivery.
    </p>
    <p>
      Our model is simple: no logistics staff to hire, no fleet to manage, no
      guesswork on where your orders are. Just a reliable operating partner
      handling the last mile, so your team can focus on what you do best.
    </p>
    <p>
      Tuuraa is based in Lagos and built for Lagos, we understand the city's
      traffic patterns, delivery windows, and the pace SMEs need to move at to
      compete.
    </p>
  </StaticPage>
);
