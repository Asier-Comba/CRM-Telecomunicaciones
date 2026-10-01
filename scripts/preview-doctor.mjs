import { nodeSupported, portAvailable, previewPort, previewUrl, projectStatus } from './preview-common.mjs'
try {
  const project = projectStatus()
  const port = previewPort()
  const available = await portAvailable(port)
  console.log(`CRM Telecom preview doctor\nNode: ${process.versions.node} (${nodeSupported() ? 'supported' : 'Requires Node 24.x; install Node24 from nodejs.org and reopen the terminal'})\nOS: ${process.platform}\nRepository: ${project.root}\nBranch/SHA: ${project.branch} / ${project.sha}\nFiles: ${project.missing.length ? `missing ${project.missing.join(', ')}` : 'present'}\nDependencies: ${project.dependencies ? 'present' : 'missing; run npm ci or npm run preview:setup -- --install'}\nDev contract: ${project.compatible ? 'compatible' : 'wrong project; use the preview candidate checkout'}\nPort ${port}: ${available ? 'free' : 'occupied; stop the local server or select PREVIEW_PORT explicitly'}\nURL on THIS machine: ${previewUrl(port)}\nSynthetic data only; no credentials or .env.local required.`)
  if (!nodeSupported() || project.missing.length || !project.compatible || !project.dependencies || !available) process.exitCode = 1
} catch (error) { console.error(error.message); process.exitCode = 1 }
