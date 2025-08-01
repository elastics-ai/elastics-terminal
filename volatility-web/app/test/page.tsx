export default function TestPage() {
  return (
    <div style={{ padding: '20px' }}>
      <h1>Test Page - Hot Reload Working! 🚀</h1>
      <p>If you can see this, the app is running.</p>
      <p>Real-time changes are enabled - edit this file to see updates instantly!</p>
      <p style={{ color: 'green' }}>Last updated: {new Date().toLocaleTimeString()}</p>
    </div>
  )
}