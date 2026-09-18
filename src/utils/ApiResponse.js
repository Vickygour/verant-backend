/**
 * Standard success envelope so every endpoint returns the same shape:
 * { success: true, message, data }
 */
class ApiResponse {
  constructor(statusCode, message = 'Success', data = null) {
    this.success = statusCode < 400;
    this.statusCode = statusCode;
    this.message = message;
    this.data = data;
  }

  send(res) {
    return res.status(this.statusCode).json({
      success: this.success,
      message: this.message,
      data: this.data,
    });
  }
}

module.exports = ApiResponse;
