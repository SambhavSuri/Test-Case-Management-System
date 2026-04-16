import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import Dashboard from "./pages/Dashboard";
import TestCaseRepository from "./pages/TestCaseRepository";
import TestExecutionCycle from "./pages/TestExecutionCycle";
import TestPlans from "./pages/TestPlans";
import QualityReports from "./pages/QualityReports";
import TraceabilityMatrix from "./pages/TraceabilityMatrix";
import AutomationRunner from "./pages/AutomationRunner";

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="projects" element={<TestCaseRepository />} />
          <Route path="test-cases" element={<TestExecutionCycle />} />
          <Route path="test-plans" element={<TestPlans />} />
          <Route path="requirements" element={<TraceabilityMatrix />} />
          <Route path="reports" element={<QualityReports />} />
          <Route path="automation" element={<AutomationRunner />} />
        </Route>
      </Routes>
    </Router>
  );
}
