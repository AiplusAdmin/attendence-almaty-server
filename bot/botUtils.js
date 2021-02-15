
function getClientInfo(message) {
	
}

function getLastMessageText(message) {
	return message.message.text;
}

function buildDefaultButton(text, callback_data) {
	return [{
		text: text,
		callback_data: callback_data
	}]
}

function buildUrlButtonOne(text, url) {
	console.log('eto ya');
	return {
		reply_markup: JSON.stringify({
			inline_keyboard: [
			  [{ text: text,url: url }]
			]
		})
	}
}

function buildUrlButton(obj) {
	console.log('suka ya');
	return {
		reply_markup: JSON.stringify({
			inline_keyboard: obj	
		})
	}
}


function buildShareButton(text, shareUrl) {
	return [{
		text: text,
		url: shareUrl
	}]
}

function buildMessageOptions(buttons) {
	return {
		parse_mode: "HTML",
		disable_web_page_preview: false,
		reply_markup: JSON.stringify({
			inline_keyboard: buttons
		})
	}
}

function buildMessageOptionsForVoting() {
	return {
		parse_mode: "HTML",
		disable_web_page_preview: false,
		reply_markup: JSON.stringify({
			inline_keyboard: [
				[{ text: 'Да', callback_data: 'yes' }, { text: 'Нет', callback_data: 'no' }]
			]
		})
	};
}

function getRoleButton(){
	return{
		reply_markup: JSON.stringify({
			inline_keyboard: [
			  [{ text: 'Родитель', callback_data: 1 }],
			  [{ text: 'Ученик', callback_data: 2 }]
			]
		})
	}
}

function YesNo(){
	return{
		reply_markup: JSON.stringify({
			inline_keyboard: [
			  [{ text: 'Да', callback_data: 1 }],
			  [{ text: 'Нет', callback_data: 0 }]
			]
		})
	}
}
module.exports = {
	getClientInfo,
	getLastMessageText,
	buildDefaultButton,
	buildUrlButton,
	buildUrlButtonOne,
	buildShareButton,
	buildMessageOptions,
	buildMessageOptionsForVoting,
	getRoleButton,
	YesNo
};