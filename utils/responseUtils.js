// Utility function to send a success response
const handleSuccess = (res, data, statusCode = 200) => {
    return res.status(statusCode).json({
        success: true,
        data: data,
    });
};

// Utility function to send an error response
const handleError = (res, message, error = null, statusCode = 500) => {
    console.error(error);
    return res.status(statusCode).json({
        success: false,
        message: message,
        error: error ? error.message : null,
    });
};

module.exports = {
    handleSuccess,
    handleError,
};
