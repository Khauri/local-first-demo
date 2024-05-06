import {perform} from '../../actions';

export const POST: MarkoRun.Handler = async (ctx, next) => {
  try {
    const {request} = ctx;
    const body = await request.json();
    const result = await perform(body);
    return new Response(JSON.stringify(result), { headers: { 'Content-Type': 'application/json' }, status: 200 });
  } catch(err) {
    console.error('Failed to perform operation', err);
    return new Response('Failed to perform operation', { status: 500 });
  }
};