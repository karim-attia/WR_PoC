// Add your requirements
var restify = require('restify');
var builder = require('botbuilder');
var botbuilder_azure = require("botbuilder-azure");
var dotenv = require('dotenv'); 
var validIBAN = require('IBAN');
var validCreditCard = require('card-validator');

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

// Bot storage
var tableName = 'botdata';
var azureTableClient = new botbuilder_azure.AzureTableClient(tableName, process.env['AzureWebJobsStorage']);
var tableStorage = new botbuilder_azure.AzureBotStorage({ gzipData: false }, azureTableClient);

// Create your bot with a function to receive messages from the user
var bot = new builder.UniversalBot(connector, {
    localizerSettings: { 
        botLocalePath: "./locale", 
        defaultLocale: "de-DE"
    }
});

bot.set('storage', tableStorage);


// Welcome message
bot.on('conversationUpdate', function(session) {
    if (session.membersAdded) {
        session.membersAdded.forEach(function(identity) {
            if (identity.id === session.address.bot.id) {
                var customMessage = new builder.Message().address(session.address)
                    .text("Guten Tag! Tippen Sie etwas, um den Chatbot zu starten.");
                bot.send(customMessage);
            }
        });
    }
});

// Dialogs

// Root Dialog: Refers to Use Case Choice
bot.dialog('/', [
    function (session) {
        var frage = "Wie kann ich Ihnen heute helfen?";
        session.beginDialog('useCaseChoice', frage);
    }

]);

// Auswahl des Use Case
bot.dialog('useCaseChoice', [
    function (session, frage) {
        //var frage = "Wie kann ich Ihnen heute helfen?";
        var choices = [
            "Auflösung Konto",
            "Auflösung Kreditkarte",
            "Hilfe / Anleitung",
        ];
        builder.Prompts.choice(session, frage, choices, {listStyle: builder.ListStyle["button"]});
    },
    function (session, results) {
        session.dialogData.useCase = results.response.entity;
        switch (session.dialogData.useCase) {
            case "Auflösung Konto":
                session.beginDialog("Auflösung Konto");
                break;
            case "Auflösung Kreditkarte":
                session.beginDialog("Auflösung Kreditkarte");
                break;
            case "Hilfe / Anleitung":
                session.send("Die Hilfefunktion ist momentan noch nicht implementiert.");
                session.beginDialog("End");
                break;
            default:
                session.endDialog();
        }
    }
]);

// Use Case Auflösung Kreditkarte
bot.dialog('Auflösung Kreditkarte', [
    function (session) {
        session.send("Sie befinden sich jetzt in der Kreditkartenauflösung. Dafür brauche ich einige Angaben von Ihnen. <br> Sie können den Vorgang jederzeit abbrechen indem Sie _stop_ schreiben.");
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
        session.send("Sie befinden sich jetzt in der Kontoauflösung. Dafür brauche ich einige Angaben von Ihnen. <br> Sie können den Vorgang jederzeit abbrechen indem Sie _stop_ schreiben.");
        session.beginDialog('Kontonummer');
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

// Direkt auf useCaseChoice verlinken?
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
            builder.Prompts.text(session, messageWithSuggestedAction(session, "Bitte geben Sie eine 7-stellige Kontonummer aus auschliesslich Zahlen an.", "1234567", "1234567", "123456", "123456"));
        } else {
            builder.Prompts.text(session, messageWithSuggestedAction(session, "Wie lautet Ihre Kontonummer?", "1234567", "1234567", "123456", "123456"));
        }
    },
    function (session, results) {
        session.userData.kontonummer = results.response;
        var reg = new RegExp('^\[0-9]{7}$');
        if (reg.test(session.userData.kontonummer)) {
            session.endDialogWithResult(results);
        } else {
            session.replaceDialog('Kontonummer', { reprompt: true });
        }
    }
]);

// Unterschrift
bot.dialog('Unterschrift', [
    function (session) {
        var customMessage = new builder.Message(session)
            .text("Haben Sie die Unterschrift des Kunden geprüft? <br> (Ja/Nein/Nicht nötig)")
	            .suggestedActions(
                builder.SuggestedActions.create(
				session, [
					builder.CardAction.imBack(session, "Ja", "Ja"),
					builder.CardAction.imBack(session, "Nein", "Nein"),
                    builder.CardAction.imBack(session, "Nicht nötig", "Nicht nötig"),
				]
			));
        builder.Prompts.text(session, customMessage);
    },
    function (session, results) {
        session.userData.unterschrift = results.response;
        session.endDialogWithResult(results);
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
        builder.Prompts.time(session, messageWithSuggestedAction(session, "Auf welchen Zeitpunkt soll das Konto aufgelöst werden?", today, "Heute", lastDayOfMonth, "Ende Monat"));
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
            builder.Prompts.text(session, messageWithSuggestedAction(session, "Bitte geben Sie eine gültige IBAN ein.", "DE15 0076 8300 1314 5710 30", "DE15 0076 8300 1314 5710 30", "CH15 0076 8300 1314 5710 3", "CH15 0076 8300 1314 5710 3"));
        } else {
            builder.Prompts.text(session, messageWithSuggestedAction(session, "Wie lautet die IBAN ihres Referenzkontos, auf welches ein allfälliges Restguthaben überwiesen werden soll?", "DE15 0076 8300 1314 5710 30", "DE15 0076 8300 1314 5710 30", "CH15 0076 8300 1314 5710 3", "CH15 0076 8300 1314 5710 3"));
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
    function (session) {
        builder.Prompts.text(session, messageWithSuggestedAction(session, "Ist dies Ihr letztes Konto bei uns? <br> (Ja/Nein)", "Ja", "Ja", "Nein", "Nein"));
    },
    function (session, results) {
        session.userData.letztesKonto = results.response;
        session.endDialogWithResult(results);
    }
]);

// KontoauflösungZusammenfassung
bot.dialog('KontoauflösungZusammenfassung', [
    function (session) {
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
					"text": "Alles klar, ich habe die Kontoauflösung für Sie notiert. Hier die Angaben:",
					"wrap": true
				},
				{   "type": "FactSet",
					"facts": [
						{	"title": "Konto:",
							"value": session.userData.kontonummer
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

// Kreditkartennummer
bot.dialog('Kreditkartennummer', [
    function (session, args) {
        if (args && args.reprompt) {
            builder.Prompts.text(session, messageWithSuggestedAction(session, "Bitte geben Sie eine gültige Kreditkartennummer ein.", "4111 1111 1111 1111", "4111 1111 1111 1111", "4111 1111 1111 11112", "4111 1111 1111 1112"));
        } else {
            builder.Prompts.text(session, messageWithSuggestedAction(session, "Wie lautet die Kreditkartennummer Ihrer Kreditkarte, welche Sie auflösen wollen?", "4111 1111 1111 1111", "4111 1111 1111 1111", "4111 1111 1111 11112", "4111 1111 1111 1112"));
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
					"text": "Alles klar, ich habe die Kontoauflösung für Sie notiert. Hier die Angaben:",
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
