import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import Dashboard from "./pages/Dashboard";
import Entries from "./pages/Entries";
import Expenses from "./pages/Expenses";
import Members from "./pages/Members";
import CostCenters from "./pages/CostCenters";
import Settings from "./pages/Settings";
import Reports from "./pages/Reports";
import Receipts from "./pages/Receipts";
import AnnualBudget from "./pages/AnnualBudget";
import Goals from "./pages/Goals";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/entries" component={Entries} />
      <Route path="/expenses" component={Expenses} />
      <Route path="/members" component={Members} />
      <Route path="/cost-centers" component={CostCenters} />
      <Route path="/settings" component={Settings} />
      <Route path="/reports" component={Reports} />
      <Route path="/receipts" component={Receipts} />
      <Route path="/annual-budget" component={AnnualBudget} />
      <Route path="/goals" component={Goals} />
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
