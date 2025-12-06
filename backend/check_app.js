const app = require('./index');
console.log('App type:', typeof app);
console.log('App function:', typeof app.listen);
if (typeof app === 'function') {
    console.log('App is a function (Express app)');
} else {
    console.log('App is NOT a function');
}
