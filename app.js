// Add your requirements
var restify = require('restify');
var builder = require('botbuilder');
//var botbuilder_azure = require("botbuilder-azure");
var dotenv = require('dotenv'); 
var validIBAN = require('IBAN');
var validCreditCard = require('card-validator');
var nodemailer = require('nodemailer');
var uuidv1 = require('uuid/v1');

dotenv.config()

// Setup Restify Server
var server = restify.createServer();
server.listen(process.env.port || process.env.PORT || 3978, function () {
   console.log('%s listening to %s', server.name, server.url); 
});
  
// Create chat connector for communicating with the Bot Framework Service
var connector = new builder.ChatConnector({
    appId: process.env.MicrosoftAppId,
    appPassword: process.env.MicrosoftAppPassword,
    openIdMetadata: process.env.BotOpenIdMetadata 
});

// Listen for messages from users 
server.post('/api/messages', connector.listen());

// Luis variables
var luisAppId = process.env.LuisAppId;
var luisAPIKey = process.env.LuisAPIKey;
var luisAPIHostName = process.env.LuisAPIHostName || 'westeurope.api.cognitive.microsoft.com';
const LuisModelUrl = 'https://' + luisAPIHostName + '/luis/v2.0/apps/' + luisAppId + '?subscription-key=' + luisAPIKey;

// Email
var transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.mailUser,
      pass: process.env.mailPassword
    }
});

function sendEmail (subject, text) {
var mailOptions = {
    from: process.env.mailFrom,
    to: process.env.mailTo,
    subject: subject,
    text: text
};
transporter.sendMail(mailOptions, function(error, info){
    if (error) {
      console.log("Fehler Email Versand: " + error);
    } else {
      console.log("Email sent to: " + process.env.mailTo + "<br>" + info.response);
    }
    }); 
}

// Bot storage
//var tableName = 'botdata';
//var azureTableClient = new botbuilder_azure.AzureTableClient(tableName, process.env['AzureWebJobsStorage']);
//var tableStorage = new botbuilder_azure.AzureBotStorage({ gzipData: false }, azureTableClient);
var inMemoryStorage = new builder.MemoryBotStorage();
// Create your bot with a function to receive messages from the user
var bot = new builder.UniversalBot(connector, {});
//bot.set('storage', tableStorage);
bot.set('storage', inMemoryStorage);

/*
// Welcome message
bot.on('conversationUpdate', function(session) {
    if (session.membersAdded) {
        session.membersAdded.forEach(function(identity) {
            if (identity.id === session.address.bot.id) {
*/

// https://stackoverflow.com/questions/43048088/microsoft-bot-framework-sending-message-on-connect/43050305
// https://github.com/Microsoft/BotBuilder/issues/2093
// Send welcome when conversation with bot is started, by initiating the root dialog
bot.on('conversationUpdate', function (message) {
    if (message.membersAdded) {
        message.membersAdded.forEach(function (identity) {
            if (identity.id === message.address.bot.id) {
                var customMessage1 = new builder.Message().address(message.address).text("Guten Tag!");
                var customMessage2 = new builder.Message().address(message.address).text("Mit diesem Chatbot können Sie einfach die Daten für eine Konto- oder Kreditkartenschliessung erfassen. Der Chatbot wird Sie durch die Abfrage der nötigen Daten führen und die Daten danach einem Roboter zur Verfügung stellen. Dieser Roboter erstellt dann mit den Daten einen Vorgang in Agree21 für Sie, wodurch Sie sich einiges an manueller Arbeit einsparen.");
                var customMessage3 = new builder.Message().address(message.address).text("Oftmals gibt es in den Dialogfeldern oder oberhalb Ihres Textfeldes Knöpfe mit Text. Wenn Sie auf diese klicken, senden Sie diesen Text, wie wenn Sie ihn selbst geschrieben hätten. Somit müssen Sie weniger tippen. Probieren Sie es gleich aus, indem Sie im Dialogfeld unten auf einen Knopf drücken.");
                var frage = "Wie kann ich Ihnen heute helfen?";
                var customMessage4 = new builder.Message().address(message.address).text('Bitte klicken Sie auf _Start_, um den Chatbot zu starten.').addAttachment(new builder.HeroCard()
                    .buttons([
                        builder.CardAction.imBack(null, 'Start', 'Start')
                    ])); 
                bot.send(customMessage1);
                setTimeout(function () {
                    bot.send(customMessage2);
                }, 1000);
                setTimeout(function () {
                    bot.send(customMessage3);
                }, 2000);
                setTimeout(function () {
                    bot.send(customMessage4);
                }, 3000);
                //bot.beginDialog(message.address, '/');
            }
        });
    }
});

// Main dialog with LUIS
console.log('\n ----------------------------- This is a new message. -----------------------------\n ');
console.log('LuisModelUrl: ' + LuisModelUrl);

// Create a recognizer that gets intents from LUIS, and add it to the bot
var recognizer = new builder.LuisRecognizer(LuisModelUrl);

// Dialogs

// Root Dialog: Refers to Use Case Choice
bot.dialog('/', [
    function (session) {
        var locale = "de";
        session.preferredLocale(locale, function (err) {
            if (err) {
                session.error(err);
            }
        });
        // Done in welcome message
        /*
        session.send("Guten Tag!");
        session.sendTyping();
        setTimeout(function () {
            session.send("Mit diesem Chatbot können Sie einfach die Daten für eine Konto- oder Kreditkartenschliessung erfassen. Der Chatbot wird Sie durch die Abfrage der nötigen Daten führen und die Daten danach einem Roboter zur Verfügung stellen. Dieser Roboter erstellt dann mit den Daten einen Vorgang in Agree21 für Sie, wodurch Sie sich einiges an manueller Arbeit einsparen.");
            session.sendTyping();
        }, 1000);
        setTimeout(function () {
            session.send("Oftmals hat es in den Dialogfeldern oder oberhalb Ihres Textfeldes Knöpfe mit Text. Wenn Sie auf diese klicken, senden Sie diesen Text, wie wenn Sie ihn selbst geschrieben hätten. Somit müssen Sie weniger tippen. Probieren Sie es gleich aus, indem Sie im Dialogfeld unten auf einen Knopf drücken.");
            session.sendTyping();
        }, 2000);
        var frage = "Wie kann ich Ihnen heute helfen?";
        setTimeout(function () {
            session.send(messageWithButtons(session, frage, "Ich möchte ein Konto auflösen.", "Ich möchte ein Konto auflösen.", "Ich möchte eine Kreditkarte auflösen.", "Ich möchte eine Kreditkarte auflösen.", "Hilfe / Anleitung", "Hilfe / Anleitung"));
        }, 3000);
        */
        var frage = "Wie kann ich Ihnen heute helfen?";
        session.beginDialog('useCaseChoice', frage);
    }
]);


// Auswahl des Use Case
bot.dialog('useCaseChoice', [
    function (session, frage) {
        /*var choices = [
            "Ich möchte ein Konto auflösen.",
            "Ich möchte eine Kreditkarte auflösen.",
            "Hilfe / Anleitung",
        ];*/
        session.send(messageWithButtons(session, frage, "Ich möchte ein Konto auflösen.", "Ich möchte ein Konto auflösen.", "Ich möchte eine Kreditkarte auflösen.", "Ich möchte eine Kreditkarte auflösen.", "Hilfe / Anleitung", "Hilfe / Anleitung"));
        session.beginDialog('Intents');
    },
]);


// Dialog choice
var intents = new builder.IntentDialog({ recognizers: [recognizer] })
.matches('Auflösung Kreditkarte', (session) => {
    console.log("LUIS: Auflösung Kreditkarte")
    session.beginDialog('Auflösung Kreditkarte', session.userData.profile);
})
.matches('Auflösung Konto', (session) => {
    console.log("LUIS: Auflösung Konto")
    session.beginDialog('Auflösung Konto', session.userData.profile);
})
.matches('Hilfe / Anleitung', (session) => {
    console.log("LUIS: Hilfe / Anleitung")
    session.send("Die Hilfefunktion ist momentan noch nicht implementiert.");
    session.beginDialog("End");
})
.onDefault((session) => {
    var frage = 'Ich konnte Ihre Nachricht \"' + session.message.text + '\" nicht verstehen. Bitte wählen Sie eine Option von den Knöpfen.';
    session.beginDialog('useCaseChoice', frage);
});

//bot.dialog('/', intents);    
bot.dialog("Intents", intents);


// Use Case Auflösung Kreditkarte
bot.dialog('Auflösung Kreditkarte', [
    function (session) {
        session.send("Sie befinden sich jetzt in der **Kreditkartenauflösung**. Dafür brauche ich einige Angaben von Ihnen. <br> Sie können den Vorgang jederzeit abbrechen indem Sie _stop_ schreiben.");
        session.beginDialog('Kontonummer');
    },
    function (session, results) {
        session.beginDialog('Kreditkartennummer');
    },
    function (session, results) {
        session.beginDialog('Unterschrift');
    },
    function (session, results) {
        session.beginDialog('KreditkartenauflösungZusammenfassung');
        session.replaceDialog("End");
    }
]);


bot.dialog('Auflösung Konto', [
    function (session) {
        session.send("Sie befinden sich jetzt in der **Kontoauflösung**. Dafür brauche ich einige Angaben von Ihnen. <br> Sie können den Vorgang jederzeit abbrechen indem Sie _stop_ schreiben.");
        session.beginDialog('Kontonummer');
    },
    function (session, results) {
        session.beginDialog('Familienname');
    },
    function (session, results) {
        session.beginDialog('Unterschrift');
    },
    function (session, results) {
        session.beginDialog('Termin');
    },    
    function (session, results) {
        session.beginDialog('Referenzkonto');
    },
    
    function (session, results) {
        session.beginDialog('LetztesKonto');
    },
    function (session, results) {
        session.beginDialog('KontoauflösungZusammenfassung');
        session.replaceDialog("End");
    }
]);

// Dialogende
bot.dialog('End', [
    function (session) {
        var frage = "Kann ich Ihnen sonst noch irgendwie weiterhelfen?";
        session.beginDialog('useCaseChoice', frage);
    }
]);

// Stopwort
bot.dialog('Cancel', [
    function (session) {
        session.endConversation('In Ordnung, die Konversation wird zurückgesetzt.');
        session.beginDialog('End');
    }
])
.triggerAction({
    matches: /^cancel$|^stop$|^end$|^reset|^clear$|^c$|^start over$/i,
});

// Konto
bot.dialog('Kontonummer', [
    function (session, args) {
        if (args && args.reprompt) {
            builder.Prompts.text(session, messageWithSuggestedAction(session, "Bitte geben Sie eine 10-stellige **Kontonummer** aus auschliesslich Zahlen an, zum Beispiel _1234567890_.", "1234567890", "1234567890", "123456789", "123456789"));
        } else {
            builder.Prompts.text(session, messageWithSuggestedAction(session, "Wie lautet Ihre **Kontonummer**? <br> Eine Kontonummer ist 10-stellig und besteht ausschliesslich aus Zahlen, zum Beispiel _1234567890_.", "1234567890", "1234567890", "123456789", "123456789"));
        }
    },
    function (session, results) {
        session.userData.kontonummer = results.response;
        var reg = new RegExp('^\[0-9]{10}$');
        if (reg.test(session.userData.kontonummer)) {
            session.endDialogWithResult(results);
        } else {
            session.replaceDialog('Kontonummer', { reprompt: true });
        }
    }
]);

// Unterschrift
bot.dialog('Unterschrift', [
    function (session, args) {
        if (args && args.reprompt) {
            builder.Prompts.text(session, messageWithSuggestedAction3(session, "Bitte prüfen Sie die **Unterschrift** des Kunden falls nötig und bestätigen mit _Ja_ oder _Nicht nötig_.", "Ja", "Ja", "Nein", "Nein", "Nicht nötig", "Nicht nötig"));
        } else {
            builder.Prompts.text(session, messageWithSuggestedAction3(session, "Haben Sie die **Unterschrift** des Kunden geprüft? <br> (Ja/Nein/Nicht nötig)", "Ja", "Ja", "Nein", "Nein", "Nicht nötig", "Nicht nötig"));
        }    

    },
    function (session, results) {
        session.userData.unterschrift = results.response;
        if (session.userData.unterschrift == "Ja" || session.userData.unterschrift == "Nicht nötig") {
            session.endDialogWithResult(results);
        } else {
            session.replaceDialog('Unterschrift', { reprompt: true, });
        }
    }
]);

// Familienname
bot.dialog('Familienname', [
    function (session, args) {
        if (args && args.reprompt) {
            builder.Prompts.text(session, messageWithSuggestedAction(session, "Bitte geben Sie Ihren Familiennamen bestehend aus ausschliesslich Buchstaben an.", "Gollwitzer", "Gollwitzer", "Attia", "Attia"));
        } else {
            builder.Prompts.text(session, messageWithSuggestedAction(session, "Wie lautet Ihr Familienname?", "Gollwitzer", "Gollwitzer", "Attia", "Attia"));
        }    
    },
    function (session, results) {
        session.userData.familienname = results.response;
        // uncomment the following lines and define reg in order to check the format of the name
        //var reg = new RegExp('^\[0-9]{10}$');
        //var reg = new RegExp('^\\p{L}+$');
        //if (session.userData.familienname)) {
            session.endDialogWithResult(results);
        //} else {
        //    session.replaceDialog('Familienname', { reprompt: true, });
        //}
    }
]);

// Datumsfunktion
function convertDate(inputDate) {
    var dd = inputDate.getDate();
    var mm = inputDate.getMonth()+1; //January is 0!
    var yyyy = inputDate.getFullYear();
    if(dd<10){dd='0'+dd;} 
    if(mm<10){mm='0'+mm;} 
    var inputDate = dd+'.'+mm+'.'+yyyy;
    return inputDate;
}

// Termin
bot.dialog('Termin', [
    function (session) {
        var today = new Date();
        var lastDayOfMonth = new Date(today.getFullYear(), today.getMonth()+1, 0);
        var today = convertDate(today);
        var lastDayOfMonth = convertDate(lastDayOfMonth);
        builder.Prompts.time(session, messageWithSuggestedAction(session, "Auf welchen **Zeitpunkt** soll das Konto aufgelöst werden?", today, "Heute", lastDayOfMonth, "Ende Monat"));
    },
    function (session, results) {
        session.userData.termin = results.response.entity;
        session.endDialogWithResult(results);
    }
]);

// Referenzkonto
bot.dialog('Referenzkonto', [
    function (session, args) {
        if (args && args.reprompt) {
            builder.Prompts.text(session, messageWithSuggestedAction(session, "Bitte geben Sie eine gültige **IBAN** ein. <br> Eine IBAN hat dieses Format: _DE15 0076 8300 1314 5710 3_.", "DE15 0076 8300 1314 5710 30", "DE15 0076 8300 1314 5710 30", "CH15 0076 8300 1314 5710 3", "CH15 0076 8300 1314 5710 3"));
        } else {
            builder.Prompts.text(session, messageWithSuggestedAction(session, "Wie lautet die **IBAN Ihres Referenzkontos**, auf welches ein allfälliges Restguthaben überwiesen werden soll? <br> Eine IBAN hat dieses Format: _DE15 0076 8300 1314 5710 3_.", "DE15 0076 8300 1314 5710 30", "DE15 0076 8300 1314 5710 30", "CH15 0076 8300 1314 5710 3", "CH15 0076 8300 1314 5710 3"));
        }
    },
    function (session, results) {
        session.userData.referenzkonto = results.response;
        console.log(session.userData.referenzkonto);
        console.log("validIBAN Test: " + validIBAN.isValid(session.userData.referenzkonto));

        if (validIBAN.isValid(session.userData.referenzkonto)) {
            session.endDialogWithResult(results);
        } else {
            session.replaceDialog('Referenzkonto', { reprompt: true });
        }
    }
]);

// LetztesKonto
bot.dialog('LetztesKonto', [
    function (session, args) {
        if (args && args.reprompt) {
            builder.Prompts.text(session, messageWithSuggestedAction(session, "Ist dies Ihr **letztes Konto** bei uns? Bitte bestätigen Sie mit _Ja_ oder _Nein_.", "Ja", "Ja", "Nein", "Nein"));
        } else {
            builder.Prompts.text(session, messageWithSuggestedAction(session, "Ist dies Ihr **letztes Konto** bei uns? <br> (Ja/Nein)", "Ja", "Ja", "Nein", "Nein"));
        }    
    },
    function (session, results) {
        session.userData.letztesKonto = results.response;
        if (session.userData.letztesKonto == "Ja" || session.userData.letztesKonto == "Nein") {
            session.endDialogWithResult(results);
        } else {
            session.replaceDialog('LetztesKonto', { reprompt: true, });
        }
    }

]);

// KontoauflösungZusammenfassung
bot.dialog('KontoauflösungZusammenfassung', [
    function (session) {
        var KontoMail = "konto;" + session.userData.kontonummer + ";" + "\nfamilienname;" + session.userData.familienname + ";" + "\nunterschrift;" + session.userData.unterschrift + ";" + "\ntermin;" + session.userData.termin + ";" + "\nreferenzkonto;" + session.userData.referenzkonto + ";" + "\nletztesKonto;" + session.userData.letztesKonto + ";";
        sendEmail("Kontoauflösung " + uuidv1(), KontoMail);

        var customMessage = new builder.Message(session)
        .addAttachment({
        contentType: "application/vnd.microsoft.card.adaptive",
        content: {
            type: "AdaptiveCard",
	    "body": [
		{
			"type": "Container",
			"items": [
				{   "type": "TextBlock",
					"text": "Alles klar, ich habe die Kontoauflösung für Sie notiert und an den Roboter geschickt. Hier die Angaben:",
					"wrap": true
				},
				{   "type": "FactSet",
					"facts": [
						{	"title": "Konto:",
							"value": session.userData.kontonummer
						},
						{	"title": "Familienname:",
							"value": session.userData.familienname
						},
						{	"title": "Unterschrift bestätigt:",
							"value": session.userData.unterschrift
						},
                        {	"title": "Zeitpunkt:",
							"value": session.userData.termin
						},
                        {	"title": "Referenzkonto:",
							"value": session.userData.referenzkonto
						},
                        {   "title": "Letztes Konto:",
							"value": session.userData.letztesKonto
						}
        ]}]}]}});
        session.send(customMessage);
    }
]);

function generateCreditCardMail (kontonummer, kreditkartennummer, unterschrift) {
    return "konto;" + kontonummer + ";\nkreditkartennummer;" + kreditkartennummer + ";\nunterschrift;" + unterschrift + ";"
}

// Kreditkartennummer
bot.dialog('Kreditkartennummer', [
    function (session, args) {
        if (args && args.reprompt) {
            builder.Prompts.text(session, messageWithSuggestedAction(session, "Bitte geben Sie eine gültige **Kreditkartennummer** ein. <br> Eine Kreditkartennummer besteht aus 16 Zahlen, zum Beispiel _4111 1111 1111 1111_.", "4111 1111 1111 1111", "4111 1111 1111 1111", "4111 1111 1111 11112", "4111 1111 1111 1112"));
        } else {
            builder.Prompts.text(session, messageWithSuggestedAction(session, "Wie lautet die **Kreditkartennummer** Ihrer Kreditkarte, welche Sie auflösen wollen? <br> Eine Kreditkartennummer besteht aus 16 Zahlen, zum Beispiel _4111 1111 1111 1111_.", "4111 1111 1111 1111", "4111 1111 1111 1111", "4111 1111 1111 11112", "4111 1111 1111 1112"));
        }
    },
    function (session, results) {
        session.userData.kreditkartennummer = results.response;
        console.log(session.userData.kreditkartennummer);
        console.log("validCreditCard Test: " + validCreditCard.number(session.userData.kreditkartennummer).isValid);

        if (validCreditCard.number(session.userData.kreditkartennummer).isValid) {
            session.endDialogWithResult(results);
        } else {
            session.replaceDialog('Kreditkartennummer', { reprompt: true });
        }
    }
]);

// KreditkartenauflösungZusammenfassung
bot.dialog('KreditkartenauflösungZusammenfassung', [
    function (session) {
        var CreditCardMail = "konto;" + session.userData.kontonummer + ";" + "\nkreditkartennummer;" + session.userData.kreditkartennummer + ";" + "\nunterschrift;" + session.userData.unterschrift + ";";
        sendEmail("Kreditkartenauflösung " + uuidv1(), CreditCardMail);
        var customMessage = new builder.Message(session)
        .addAttachment({
        contentType: "application/vnd.microsoft.card.adaptive",
        content: {
            type: "AdaptiveCard",
	    "body": [
		{	"type": "Container",
			"items": [
				{
					"type": "TextBlock",
					"text": "Alles klar, ich habe die Kreditkartenauflösung für Sie notiert und an den Roboter geschickt. Hier die Angaben:",
					"wrap": true
				},
				{	"type": "FactSet",
					"facts": [
						{	"title": "Konto:",
							"value": session.userData.kontonummer
						},
						{	"title": "Kreditkarte:",
							"value": session.userData.kreditkartennummer
						},
						{	"title": "Unterschrift bestätigt:",
							"value": session.userData.unterschrift
						}
		]}]}]}});
        session.send(customMessage);
    }
]);

function messageWithSuggestedAction (session, promptText, sendSuggestion1, displaySuggestion1, sendSuggestion2, displaySuggestion2) {
    var customMessagePrompt = new builder.Message(session)
    .text(promptText)
      .suggestedActions(
        builder.SuggestedActions.create(
    session, [
    builder.CardAction.imBack(session, sendSuggestion1, displaySuggestion1),
    builder.CardAction.imBack(session, sendSuggestion2, displaySuggestion2),                    
    ]
    ));
    return customMessagePrompt;
}
function messageWithSuggestedAction3 (session, promptText, sendSuggestion1, displaySuggestion1, sendSuggestion2, displaySuggestion2, sendSuggestion3, displaySuggestion3) {
    var customMessagePrompt = new builder.Message(session)
    .text(promptText)
      .suggestedActions(
        builder.SuggestedActions.create(
    session, [
    builder.CardAction.imBack(session, sendSuggestion1, displaySuggestion1),
    builder.CardAction.imBack(session, sendSuggestion2, displaySuggestion2),                    
    builder.CardAction.imBack(session, sendSuggestion3, displaySuggestion3),                    
    ]
    ));
    return customMessagePrompt;
}

function messageWithButtons (session, promptText, button1, displaybutton1, button2, displaybutton2, button3, displaybutton3) {
    var card = new builder.ThumbnailCard(session)
    .buttons([
        new builder.CardAction.imBack(session, button1, displaybutton1),
        new builder.CardAction.imBack(session, button2, displaybutton2),
        new builder.CardAction.imBack(session, button3, displaybutton3),
    ]
    );
    var customMessagePrompt = new builder.Message(session)
        .text(promptText)
        .addAttachment(card);
    return customMessagePrompt;
}