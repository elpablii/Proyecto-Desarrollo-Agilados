const loggingMiddleware = (req, res, next) => {
    const timestamp = new Date().toISOString();
    const ip = req.ip || req.connection.remoteAddress;
    console.log(`[REQ] [${timestamp}] ${req.method} ${req.path} - IP: ${ip}`);
    next();
};

module.exports = {
    loggingMiddleware
};