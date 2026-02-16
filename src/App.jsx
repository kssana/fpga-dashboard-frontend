import { useEffect, useRef, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend
} from "recharts";

import {
  Container,
  Grid,
  Card,
  CardContent,
  Typography,
  Box,
  Chip
} from "@mui/material";

function App() {
  // =========================
  // STATE
  // =========================
  const [data, setData] = useState([]);
  const [mode, setMode] = useState("...");
  const [latency, setLatency] = useState(0);
  const [compression, setCompression] = useState(0);
  const [alert, setAlert] = useState(false);

  // Persistent WebSocket reference
  const socketRef = useRef(null);

  // =========================
  // WEBSOCKET CONNECTION
  // =========================
  useEffect(() => {
    if (socketRef.current) return;

    const WS_URL =
      import.meta.env.PROD
        ? "wss://fgpa-dashboard-backend.onrender.com/ws/telemetry"
        : "ws://localhost:8000/ws/telemetry";

    socketRef.current = new WebSocket(WS_URL);

    socketRef.current.onopen = () => {
      console.log("✅ WebSocket connected");
    };

    socketRef.current.onmessage = (event) => {
      const parsed = JSON.parse(event.data);
      console.log("📩 Telemetry received", parsed);

      const { flow, pressure, vibration } = parsed.sensor_values;

      setData((prev) => [
        ...prev.slice(-40),
        {
          time: parsed.sequence_number,
          flow,
          pressure,
          vibration
        }
      ]);

      setMode(parsed.compression_mode);
      setLatency(parsed.latency);
      setCompression(parsed.compression_ratio);

      // Simple fault logic
      setAlert(flow > 7000 || pressure < 25000);
    };

    socketRef.current.onerror = (err) => {
      console.error("❌ WebSocket error", err);
    };

    socketRef.current.onclose = () => {
      console.warn("⚠️ WebSocket closed");
      socketRef.current = null;
    };

    return () => {
      console.log("🔻 App unmounted — closing WebSocket");
      socketRef.current?.close();
    };
  }, []);

  // =========================
  // UI
  // =========================
  return (
    <Container maxWidth="xl" sx={{ mt: 4 }}>
      <Typography variant="h3" gutterBottom>
        FPGA Telemetry Monitoring Dashboard
      </Typography>

      {/* KPI SECTION */}
      <Grid container spacing={3}>
        <KPI title="Compression Mode" value={mode} />
        <KPI title="Latency (ms)" value={latency} />
        <KPI title="Compression Ratio" value={compression} />

        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography variant="subtitle2">System Status</Typography>
              <Box mt={2}>
                <Chip
                  label={alert ? "FAULT DETECTED" : "NORMAL"}
                  color={alert ? "error" : "success"}
                />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* CHART SECTION */}
      <Box mt={5}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Real-Time Sensor Data
            </Typography>

            <LineChart width={1100} height={450} data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="time" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="flow" stroke="#1976d2" />
              <Line type="monotone" dataKey="pressure" stroke="#2e7d32" />
              <Line type="monotone" dataKey="vibration" stroke="#ed6c02" />
            </LineChart>
          </CardContent>
        </Card>
      </Box>
    </Container>
  );
}

// =========================
// KPI COMPONENT
// =========================
function KPI({ title, value }) {
  return (
    <Grid item xs={12} md={3}>
      <Card>
        <CardContent>
          <Typography variant="subtitle2">{title}</Typography>
          <Typography variant="h5" mt={2}>
            {value}
          </Typography>
        </CardContent>
      </Card>
    </Grid>
  );
}

export default App;
