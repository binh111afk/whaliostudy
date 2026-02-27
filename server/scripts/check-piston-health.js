const DEFAULT_EXECUTE_URL = 'http://127.0.0.1:2000/api/v2/execute';

const resolveRuntimesUrl = () => {
  const executeUrl = String(
    process.env.CODE_RUNNER_API_URL ||
    process.env.CODE_RUNNER_API_URLS?.split(',')?.[0] ||
    DEFAULT_EXECUTE_URL
  ).trim();

  return executeUrl.replace(/\/execute\/?$/i, '/runtimes');
};

const main = async () => {
  const runtimesUrl = resolveRuntimesUrl();
  try {
    const response = await fetch(runtimesUrl);
    if (!response.ok) {
      const body = await response.text();
      console.error(`Runner unhealthy: HTTP ${response.status}`);
      if (body) console.error(body);
      process.exit(1);
    }

    const runtimes = await response.json();
    const languages = Array.isArray(runtimes)
      ? Array.from(new Set(runtimes.map((item) => String(item?.language || '').trim()).filter(Boolean))).sort()
      : [];

    console.log(`Runner healthy at ${runtimesUrl}`);
    console.log(`Languages (${languages.length}): ${languages.join(', ')}`);
  } catch (error) {
    console.error(`Runner check failed for ${runtimesUrl}`);
    console.error(String(error?.message || error));
    process.exit(1);
  }
};

main();
