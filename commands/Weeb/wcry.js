const { Command, constants: { API: { RAM: { CDN, API } } } } = require('../../index');

module.exports = class extends Command {

	constructor(...args) {
		super(...args, {
			runIn: ['text'],
			botPerms: ['EMBED_LINKS'],
			bucket: 2,
			cooldown: 30,
			description: msg => msg.language.get('COMMAND_WCRY_DESCRIPTION'),
			extendedHelp: msg => msg.language.get('COMMAND_WCRY_EXTENDED'),
			usage: '<user:username>'
		});
	}

	async run(msg, [user]) {
		const { path } = await this.fetchURL(`${API}/i/r?type=cry`, 'json');
		return msg.sendMessage(msg.language.get('COMMAND_WCRY', user.username), {
			embed: new this.client.methods.Embed()
				.setTitle('→').setURL(CDN + path.slice(2))
				.setColor(msg.member.displayColor)
				.setImage(CDN + path.slice(2))
		});
	}

};
