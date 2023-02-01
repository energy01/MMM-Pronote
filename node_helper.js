const NodeHelper = require('node_helper')

module.exports = NodeHelper.create({
  socketNotificationReceived: function (notification, payload) {
    switch(notification) {
      case "INIT":
        this.initialize()
        break
    }
  },

  initialize: async function() {
    console.error("[PRONOTE] Initialize... failed!")
    console.error("[PRONOTE] Ce module est maintenant en fin de vie.")
  }
});
