module.exports = {
    checkPermissions: function (permissions) {
        return (req, res, next) => {
            if (!req.user || !permissions.includes(req.user.role)) {
                return res.status(403).send('Forbidden');
            }
            next();
        };
    }
};
