import App from "@/app";
import { PortalProvider } from "@/components/portal-context";

const SidePanel = () => (
  <PortalProvider container={document.body}>
    <App themeRoot={document.documentElement} />
  </PortalProvider>
);

export default SidePanel;