export const GET: MarkoRun.Handler = async (ctx, next) => {
  return new Response('OK', { headers: { 'Content-Type': 'text/plain' }, status: 200 });
};