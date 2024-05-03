import {perform} from '../../actions';

export const POST: MarkoRun.Handler = async (ctx, next) => {
  const {request} = ctx;
  const body = await request.json();
  const result = await perform(body);
  return new Response(JSON.stringify(result), { headers: { 'Content-Type': 'application/json' }, status: 200 });
};