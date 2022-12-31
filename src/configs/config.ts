import type { Config } from './config.interface';
import packageJson from '../../package.json';
const config: Config = {
  nest: {
    port: 3000 || Number(process.env.PORT),
  },
  cors: {
    enabled: true,
  },
  swagger: {
    enabled: true,
    title: `${packageJson?.name}`,
    description: `The ${packageJson?.name} API description`,
    version: packageJson?.version,
    path: 'api',
  },
  chatgpt: {
    minimize: true,
    captchaToken: process.env.CAPTCHA_TOKEN,
    nopechaKey: process.env.NOPECHA_KEY,
    executablePath: process.env.EXECUTABLE_PATH || undefined,
    proxyServer: process.env.PROXY_SERVER || undefined,
  },
};

export default (): Config => config;
