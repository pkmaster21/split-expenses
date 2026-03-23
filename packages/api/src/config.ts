let loaded = false;

export async function loadConfig(): Promise<void> {
  if (loaded) return;
  loaded = true;

  const ssmPathPrefix = process.env['SSM_PATH_PREFIX'];
  if (!ssmPathPrefix || process.env['NODE_ENV'] !== 'production') return;

  try {
    const { SSMClient, GetParametersByPathCommand } = await import('@aws-sdk/client-ssm');
    const client = new SSMClient({ region: process.env['AWS_REGION'] ?? 'us-east-1' });
    const result = await client.send(
      new GetParametersByPathCommand({
        Path: ssmPathPrefix,
        WithDecryption: true,
        Recursive: false,
      }),
    );

    for (const param of result.Parameters ?? []) {
      if (!param.Name || !param.Value) continue;
      const key = param.Name.replace(`${ssmPathPrefix}/`, '');
      process.env[key] = param.Value;
    }
  } catch (err) {
    console.error('Failed to load SSM config:', err);
    throw err;
  }
}
