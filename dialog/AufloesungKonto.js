/*
module.exports = function(bot) {
    bot.dialog('/cars',
    function(session){
        session.send('test')
    });
}
*/
var builder = require('botbuilder');

var library = new builder.Library("AuflösungKonto");

library.dialog("/AuflösungKonto", [
    function (session) {
        builder.Prompts.number(session, "Wie lautet Ihre Kontonummer?");
    },
    function (session, results) {
        session.userData.kontonummer = results.response;
        
        var customMessage = new builder.Message(session)
            .text("Haben Sie die Unterschrift des Kunden geprüft? (Ja/Nein)")
	        .suggestedActions(
                builder.SuggestedActions.create(
				session, [
					builder.CardAction.imBack(session, "Ja", "Ja"),
					builder.CardAction.imBack(session, "Nein", "Nein"),
                    builder.CardAction.imBack(session, "Nicht benötigt", "Nicht benötigt"),
				]
			));
        builder.Prompts.text(session, customMessage);
    },
    
    function (session, results) {
        session.userData.unterschrift = results.response;
        builder.Prompts.time(session, "Auf welchen Zeitpunkt soll das Konto aufgelöst werden?"); 
    },
    
    function (session, results) {
        session.userData.termin = results.response;
        builder.Prompts.number(session, "Wie lautet die IBAN ihres Referenzkontos, auf welches ein allfälliges Restguthaben überwiesen werden soll?"); 
    },
    
    function (session, results) {
        session.userData.referenzkonto = results.response;
        var customMessage = new builder.Message(session)
            .text("Ist dies Ihr letztes Konto bei uns? (Ja/Nein)")
	            .suggestedActions(
                builder.SuggestedActions.create(
				session, [
					builder.CardAction.imBack(session, "Ja", "Ja"),
					builder.CardAction.imBack(session, "Nein", "Nein"),
				]
			));
        builder.Prompts.text(session, customMessage);
        session.userData.letzteskonto = results.response;
    },
    /*
    function (session, results) {
        session.userData.kontonummer = results.response;
        builder.Prompts.number(session, "Wie lautet die Kreditkartennummer Ihrer Kreditkarte, welche Sie auflösen wollen?"); 
    },
    */
    function (session, results) {
        session.userData.unterschrift = results.response;
        var customMessage = new builder.Message(session)
    .addAttachment({
        contentType: "application/vnd.microsoft.card.adaptive",
        content: {
            type: "AdaptiveCard",
	"body": [
		{
			"type": "Container",
			"items": [
				{
					"type": "TextBlock",
					"text": "Alles klar, ich habe die Kontoauflösung für Sie notiert. Hier die Angaben:",
					"wrap": true
				},
				{
					"type": "FactSet",
					"facts": [
						{
							"title": "Konto:",
							"value": session.userData.kontonummer
						},
						{
							"title": "Unterschrift bestätigt:",
							"value": session.userData.unterschrift
						},
						/*{
							"title": "Zeitpunkt:",
							"value": session.userData.termin
						},*/
                        {
							"title": "Referenzkonto:",
							"value": session.userData.referenzkonto
						},{
							"title": "Letztes Konto:",
							"value": session.userData.letzteskonto
						}
					]
				}
			]
		}
	]

        }
    });
        session.send(customMessage);
        session.replaceDialog("End");
    }
]);
