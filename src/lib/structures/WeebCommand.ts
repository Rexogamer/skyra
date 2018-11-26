import { Client, Message, MessageEmbed, TextChannel, User } from 'discord.js';
import { Command, CommandOptions, CommandStore, util } from 'klasa';
import { URL } from 'url';
import { TOKENS, VERSION } from '../../../config';
import { fetch } from '../util/util';

export class WeebCommand extends Command {

	/**
	 * The type for this command.
	 */
	public queryType: string;
	/**
	 * The response name for Language#get
	 */
	public responseName: string;

	private readonly requiresUser = Boolean(this.usage.parsedUsage.length);

	public constructor(client: Client, store: CommandStore, file: string[], directory: string, options: WeebCommandOptions) {
		super(client, store, file, directory, util.mergeDefault({
			bucket: 2,
			cooldown: 30,
			requiredPermissions: ['EMBED_LINKS'],
			runIn: ['text']
		}, options));

		this.queryType = options.queryType;
		this.responseName = options.responseName;
	}

	public async run(message: Message, params?: User[]): Promise<Message> {
		const query = new URL('https://api-v2.weeb.sh/images/random');
		query.searchParams.append('type', this.queryType);
		query.searchParams.append('nsfw', String((message.channel as TextChannel).nsfw));

		const { url } = await fetch(query, {
			headers: {
				Authorization: `Wolke ${TOKENS.WEEB_SH}`,
				'User-Agent': `Skyra/${VERSION}`
			}
		}, 'json');

		return message.sendMessage(this.requiresUser
			? message.language.get(this.responseName, params[0].username)
			: message.language.get(this.responseName),
		{
			embed: new MessageEmbed()
				.setTitle('→').setURL(url)
				.setColor(message.member.displayColor)
				.setImage(url)
				.setFooter(message.language.get('POWEREDBY_WEEBSH'))
		}) as Promise<Message>;
	}

}

export interface WeebCommandOptions extends CommandOptions {
	queryType: string;
	responseName: string;
}