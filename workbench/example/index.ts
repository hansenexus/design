// The example app's screens entry (design#148): the reference an app copies, and the screens the
// gallery's own tests and baselines render under every pack without a private checkout.
import { defineScreen, defineScreens } from "@hansenexus/ui/workbench";
import { machinesFixture } from "./fixtures";
import { type MachinesProps, MachinesScreen } from "./machines";

export default defineScreens({
  app: "example",
  screens: [
    defineScreen<MachinesProps>({
      id: "example/machines",
      title: "Machines",
      description: "The estate's machine list in the shell.",
      level: "template",
      group: "Estate",
      component: MachinesScreen,
      fixtures: [
        { id: "estate", label: "36 machines", load: (ctx) => machinesFixture(36, ctx) },
        { id: "new", label: "New estate", load: (ctx) => machinesFixture(0, ctx) },
      ],
    }),
  ],
});
