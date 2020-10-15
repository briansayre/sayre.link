const app = new Vue({
  el: '#app',
  data: {
    url: '',
    key: '',
    error: '',
    formVisible: true,
    created: null,
  },
  methods: {
    async createUrl() {
      this.error = '';
      const response = await fetch('/url', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          url: this.url,
          key: this.key,
        }), 
      });
      if (response.ok) {
        const result = await response.json();
        console.log(result);
        this.formVisible = false;
        this.created = `http://sayre.link/${result.key}`;
      } else if (response.status === 429) {
        this.error = 'You are sending too many requests. Try again in 30 seconds.';
      } else {
        const result = await response.json();
        this.error = result.message;
      }
    },
  },
});
