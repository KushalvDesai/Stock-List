import type { NextConfig } from "next";

if (process.env.NODE_ENV === 'development') {
  const originalStdoutWrite = process.stdout.write.bind(process.stdout);
  const originalStderrWrite = process.stderr.write.bind(process.stderr);
  
  let logBuffer: string[] = [];
  let isSending = false;

  const sendLogs = () => {
    if (logBuffer.length === 0 || isSending) return;
    isSending = true;
    const logsToSend = logBuffer.join('');
    logBuffer = [];
    fetch('http://localhost:3000/api/admin/logs/client', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ log: logsToSend })
    }).catch(() => {}).finally(() => {
      isSending = false;
    });
  };

  setInterval(sendLogs, 2000);

  (process.stdout as any).write = function(chunk: any, encoding: any, cb: any) {
    logBuffer.push(chunk.toString());
    return originalStdoutWrite(chunk, encoding, cb);
  };
  (process.stderr as any).write = function(chunk: any, encoding: any, cb: any) {
    logBuffer.push(chunk.toString());
    return originalStderrWrite(chunk, encoding, cb);
  };
}

const nextConfig: NextConfig = {
  /* config options here */
};

export default nextConfig;
