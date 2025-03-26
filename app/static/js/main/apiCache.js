
export const apiCache = {
  data: null,
  timestamp: null,

  isValid() {
    if (!this.data || !this.timestamp) return false;
    // Cache valid for 5 minutes
    return (Date.now() - this.timestamp) < 300000;
  },

  set(data) {
    this.data = data;
    this.timestamp = Date.now();
  },

  get() {
    return this.data;
  },

  clear() {
    this.data = null;
    this.timestamp = null;
  }
};
