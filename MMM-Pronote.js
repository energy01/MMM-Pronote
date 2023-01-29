/* Magic Mirror
 * Module: MMM-Pronote
 *
 * By Julien "delphiki" Villetorte
 * and @bugsounet
 * MIT Licensed.
 */

Module.register("MMM-Pronote", {
  requiresVersion: "2.17.0",
  defaults: {
    debug: false, // set it to false if you want no debug in console
    defaultAccount: 1,
    Accounts: [
      {
        url: null,
        username: null,
        password: null,
        cas: 'none',
        account: 'parent',
        studentNumber: 1, // only for parent account
      }
    ],
    rotateAccount: true,
    rotateInterval: "1m",
    updateInterval: "15m",
    PeriodType: "semester",
    Header: {
      displayEstablishmentName: true,
      displayStudentName: true,
      displayStudentClass: true,
      displayAvatar: true
    },
    Timetables: {
      displayActual: true,
      displayNextDay: true,
      displayTeacher: true,
      displayRoom: true
    },
    Averages: {
      display : true,
      displayStudent: true,
      displayClass: true
    },
    Marks: {
      display: true,
      searchDays: 7,
      displayAverage: true,
      displayCoeff: true,
      colored: true
    },
    Homeworks: {
      display: true,
      searchDays: 7,
      numberDays: 1,
      displayDescription: true,
      displayDone: true,
      lengthDescription: 150
    },
    Absences: {
      display: true,
      searchDays: 7,
      number: 1
    },
    Delays: {
      display: true,
      searchDays: 7,
      number: 1
    },
    Holidays: {
      display: true,
      number: 3
    },
    ReplaceSubjects: [],
    Notifications: {
      absences: true,
      delays: true,
      average: true,
      marks: true,
      homeworks: true
    }
  },

  start: function() {
   this.userData = {}
   this.init = false
   this.error = null
   if (this.config.debug) this.log = (...args) => { console.log("[PRONOTE]", ...args) }
   else this.log = (...args) => { /* do nothing */ }
  },

  getStyles: function() {
    return ["pronote.css"]
  },

  getTemplate: function () {
    if (!this.init) {
      return "templates/loading.njk"
    } else if(Object.keys(this.userData).length === 0) {
      return "templates/error.njk"
    } else {
      return "templates/layout.njk"
    }
  },

  getTemplateData: function () {
    if (!this.init) {
      return {
        loading: this.translate("LOADING")
      }
    } else if (this.error) {
      console.log("[PRONOTE] Error:", this.error)
      return {
        error: this.error
      }
    } else {
      return {
        config: this.config,
        userData: this.userData,
      }
    }
  },

  updateData: function(data) {
    this.userData = data
    if (Object.keys(this.userData).length === 0) {
      this.log ("Error... no data!")
      this.error = "Erreur... Aucune données"
      return
    }
    this.log("data:", this.userData)
    if (this.init) this.updateDom(500)
  },

  notificationReceived: function(notification, payload, sender) {
    switch (notification) {
      case "ALL_MODULES_STARTED":
        if (!this.config.language) this.config.language = config.language
        this.sendSocketNotification('SET_CONFIG', this.config)
        break
      case "PRONOTE_ACCOUNT":
        if (!isNaN(payload)) {
          this.sendSocketNotification("SET_ACCOUNT", payload)
        }
        else console.error("[PRONOTE] Account not a number", payload)
        break
    }
  },

  socketNotificationReceived: function(notification, payload) {
    switch (notification) {
      case "PRONOTE_UPDATED":
        if (payload) {
          this.error = null
          this.updateData(payload)
          this.sendNotification("PRONOTE_DATA", payload)
        }
        else {
          this.userData = {}
          this.error = "Erreur... Aucune données"
          this.updateDom()
        }
        break
      case "INITIALIZED":
          this.init = true
          if (!this.error) this.updateDom(500)
        break
      case "ERROR":
        this.init = true
        this.userData = {}
        this.error = payload
        this.updateDom()
        break
      case "PRONOTE_NOTI":
        let text = null
        switch (payload.type) {
          case "absences":
            if (payload.data.length == 0) return
            text = payload.name + " -- Absences:\n\n"
            payload.data.forEach(absence => {
              if (absence.oneDay) text += "Le " + absence.day + " de " + absence.fromHour + " à " + absence.toHour + ": "
              else text += "Du " + absence.localizedFrom + " au " + absence.localizedTo + ": "
              if (absence.justified) text += absence.reason + "\n"
              else text +=  "Absence non justifiée\n"
            })
            this.sendNotification("TELBOT_TELL_ADMIN", TelegramBotExtraChars(text), {parse_mode:'Markdown'})
            break
          case "retards":
            /** @todo **/
            break
          case "moyenne":
            if (!Object.keys(payload.data.averages).length) return
            text = payload.name + " -- Moyenne\n\nGénérale: " + payload.data.averages.student.toFixed(2) + "\nClasse: " + payload.data.averages.studentClass.toFixed(2)
            this.sendNotification("TELBOT_TELL_ADMIN", TelegramBotExtraChars(text), {parse_mode:'Markdown'})
            break
          case "notes":
            if (payload.data.length == 0) return
            text = payload.name + " -- Dernières notes:\n\n"
            payload.data.forEach(subject => {
              text += subject.name + " (Moyenne: " + subject.averages.student.toFixed(2) + ")\n"
              subject.marks.forEach(mark => {
                text += "Le " + mark.formattedDate + ": " + mark.title + " " + (mark.isAway ? "Absent" : mark.value + "/" + mark.scale + " Coeff:" + mark.coefficient) + "\n"
              })
              text += "\n"
            })
            this.sendNotification("TELBOT_TELL_ADMIN", TelegramBotExtraChars(text), {parse_mode:'Markdown'})
            break
          case "devoirs":
            if (payload.data.length == 0) return
            text = payload.name + " -- Devoirs:\n\n"
            let homeworkDate = null
            payload.data.forEach(homework => {
              if (homeworkDate !== homework.formattedFor) {
                text += "Pour " + homework.formattedFor + ":\n"
                homeworkDate = homework.formattedFor
              }
              if (homework.done) text += "✓ "
              text += homework.subject + ": " + homework.description + "\n"
            })
            this.sendNotification("TELBOT_TELL_ADMIN", TelegramBotExtraChars(text), {parse_mode:'Markdown'})
            break
        }
    }
  },

  /** convert h m s to ms (good idea !) **/
  getUpdateIntervalMillisecondFromString: function(intervalString) {
   let regexString = new RegExp("^\\d+[smhd]{1}$")
   let updateIntervalMillisecond = 0

   if (regexString.test(intervalString)){
     let regexInteger = "^\\d+"
     let integer = intervalString.match(regexInteger)
     let regexLetter = "[smhd]{1}$"
     let letter = intervalString.match(regexLetter)

     let millisecondsMultiplier = 1000
      switch (String(letter)) {
        case "s":
          millisecondsMultiplier = 1000
          break
        case "m":
          millisecondsMultiplier = 1000 * 60
          break
        case "h":
          millisecondsMultiplier = 1000 * 60 * 60
          break
        case "d":
          millisecondsMultiplier = 1000 * 60 * 60 * 24
          break
      }
      // convert the string into seconds
      updateIntervalMillisecond = millisecondsMultiplier * integer
    } else {
      updateIntervalMillisecond = 1000 * 60 * 60 * 24
    }
    return updateIntervalMillisecond
  },

  /** TelegramBot pronote command **/
  getCommands: function(commander) {
    commander.add({
      command: "pronote",
      description: "Change le compte de pronote",
      callback: "pronote"
    })
  },

  pronote: function(command,handler) {
    if (!this.userData) return handler.reply("TEXT", "Pronote n'est pas initialisé")
    if (handler.args) {
      var args = handler.args.split(" ")
      let text = null
      switch (args[0]) {
        case "compte":
          if (!args[1]) return handler.reply("TEXT", "Syntaxe:\n/pronote compte <numéro>")
          if (!isNaN(args[1])) {
            if (args[1] == 0 || (args[1] > this.config.Accounts.length)) return handler.reply("TEXT", "Compte non trouvé: " + args[1])
            handler.reply("TEXT", "Je change le compte pronote vers le numéro " + args[1])
            this.sendSocketNotification("SET_ACCOUNT", args[1])
          }
          else handler.reply("TEXT", args[1] + " n'est pas un numéro du compte valide")
          break
        case "moyenne":
          if (!this.userData.marks.averages) return handler.reply("TEXT", "Informations non disponible")
          if (!this.userData.marks.averages.student || !this.userData.marks.averages.studentClass) return handler.reply("TEXT", "Informations non disponible")
          text = this.userData.name + " -- Moyenne\n\nGénérale: " + this.userData.marks.averages.student.toFixed(2) + "\nClasse: " + this.userData.marks.averages.studentClass.toFixed(2)
          handler.reply("TEXT", text)
          break
        case "notes":
          if (!this.userData.marks.subjects.length) return handler.reply("TEXT", "Informations non disponible")
          text = this.userData.name + " -- Dernières notes:\n\n"
          this.userData.marks.subjects.forEach(subject => {
            text += subject.name + " (Moyenne: " + subject.averages.student.toFixed(2) + ")\n"
            subject.marks.forEach(mark => {
              text += "Le " + mark.formattedDate + ": " + mark.title + " " + (mark.isAway ? "Absent" : mark.value + "/" + mark.scale + " Coeff:" + mark.coefficient) + "\n"
            })
            text += "\n"
          })
          handler.reply("TEXT", text)
          break
        case "absences":
          text = this.userData.name + " -- Absences:\n\n"
          if (!this.userData.absences.length) return handler.reply("TEXT", "Aucune absences")
          this.userData.absences.forEach(absence => {
            if (absence.oneDay) text += "Le " + absence.day + " de " + absence.fromHour + " à " + absence.toHour + ": "
            else text += "Du " + absence.localizedFrom + " au " + absence.localizedTo + ": "
            if (absence.justified) text += absence.reason + "\n"
            else text +=  "Absence non justifiée\n"
          })
          handler.reply("TEXT", text)
          break
        case "devoirs":
          text = this.userData.name + " -- Devoirs:\n\n"
          if (!this.userData.homeworks.length) return handler.reply("TEXT", "Pas de devoirs")
          let homeworkDate = null
          this.userData.homeworks.forEach(homework => {
            if (homeworkDate !== homework.formattedFor) {
              text += "Pour " + homework.formattedFor + ":\n"
              homeworkDate = homework.formattedFor
            }
            if (homework.done) text += "✓ "
            text += homework.subject + ": " + homework.description + "\n"
          })
          handler.reply("TEXT", text)
          break
        default:
          handler.reply("TEXT", "Commande inconnue")
          break
      }
    }
    else handler.reply("TEXT", "Commandes disponible:\n\ncompte: changer de compte\nmoyenne: affiche la moyenne\nnotes: affiche les dernière notes\nabsences: affiche les absences\ndevoirs: affiche les devoirs")
  }
});
