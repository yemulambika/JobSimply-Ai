import router from './routes/index.js';

console.log(JSON.stringify(router.stack.map((layer) => ({
  name: layer.name,
  route: layer.route && layer.route.path,
  regexp: layer.regexp && layer.regexp.toString(),
})), null, 2));
