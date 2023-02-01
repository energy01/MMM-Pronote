/* Magic Mirror
 * Module: MMM-Pronote
 *
 * By Julien "delphiki" Villetorte
 * and @bugsounet
 * MIT Licensed.
 */

Module.register("MMM-Pronote", {
    notificationReceived: function (notification, payload) {
      switch(notification) {
        case "DOM_OBJECTS_CREATED":
          this.sendSocketNotification("INIT")
          this.sendNotification("SHOW_ALERT", {
            type: "notification",
            message: "[ERROR] Ce module est maintenant en fin de vie",
            title: "MMM-Pronote",
            timer: 24*60*60*1000
          })
          break
      }
    },

  getDom: function() {
    var dom = document.createElement("div")
    dom.style.display = 'none'
    return dom
  }
});
