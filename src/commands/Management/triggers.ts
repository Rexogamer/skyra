import { DbSet, GuildSettings, TriggerAlias, TriggerIncludes } from '#lib/database';
import { LanguageKeys } from '#lib/i18n/languageKeys';
import { SkyraCommand, UserPaginatedMessage } from '#lib/structures';
import type { GuildMessage } from '#lib/types';
import { PermissionLevels } from '#lib/types/Enums';
import { requiresPermissions } from '#utils/decorators';
import { displayEmoji } from '#utils/util';
import { ApplyOptions } from '@sapphire/decorators';
import { Args } from '@sapphire/framework';
import { chunk } from '@sapphire/utilities';
import { MessageEmbed } from 'discord.js';

const enum Type {
	Alias,
	Reaction
}

@ApplyOptions<SkyraCommand.Options>({
	cooldown: 5,
	description: LanguageKeys.Commands.Management.TriggersDescription,
	extendedHelp: LanguageKeys.Commands.Management.TriggersExtended,
	permissionLevel: PermissionLevels.Administrator,
	runIn: ['text'],
	subCommands: ['add', 'remove', { input: 'show', default: true }]
})
export class UserCommand extends SkyraCommand {
	public async add(message: GuildMessage, args: SkyraCommand.Args) {
		const type = await args.pick(UserCommand.type);
		const input = (await args.pick('string')).toLowerCase();
		const output = type === Type.Alias ? (await args.pick('command')).name : await args.pick('emoji');
		await message.guild.writeSettings((settings) => {
			const key = this.getListName(type);

			const list = settings[key];
			const alreadySet = list.some((entry) => entry.input === input);
			if (alreadySet) throw args.t(LanguageKeys.Commands.Management.TriggersAddTaken);

			list.push(this.format(type, input, output) as any);
		});

		return message.send(args.t(LanguageKeys.Commands.Management.TriggersAdd));
	}

	public async remove(message: GuildMessage, args: SkyraCommand.Args) {
		const type = await args.pick(UserCommand.type);
		const input = (await args.pick('string')).toLowerCase();
		await message.guild.writeSettings((settings) => {
			const key = this.getListName(type);

			const list = settings[key];
			const index = list.findIndex((entry) => entry.input === input);
			if (index === -1) throw args.t(LanguageKeys.Commands.Management.TriggersRemoveNotTaken);

			list.splice(index, 1);
		});

		return message.send(args.t(LanguageKeys.Commands.Management.TriggersRemove));
	}

	@requiresPermissions(['ADD_REACTIONS', 'EMBED_LINKS', 'MANAGE_MESSAGES', 'READ_MESSAGE_HISTORY'])
	public async show(message: GuildMessage, args: SkyraCommand.Args) {
		const [aliases, includes] = await message.guild.readSettings([GuildSettings.Trigger.Alias, GuildSettings.Trigger.Includes]);

		const output: string[] = [];
		for (const alias of aliases) {
			output.push(`Alias \`${alias.input}\` -> \`${alias.output}\``);
		}
		for (const react of includes) {
			output.push(`Reaction :: \`${react.input}\` -> ${displayEmoji(react.output)}`);
		}
		if (!output.length) throw args.t(LanguageKeys.Commands.Management.TriggersListEmpty);

		const display = new UserPaginatedMessage({
			template: new MessageEmbed()
				.setAuthor(message.author.username, message.author.displayAvatarURL({ size: 128, format: 'png', dynamic: true }))
				.setColor(await DbSet.fetchColor(message))
		});

		for (const page of chunk(output, 10)) {
			display.addPageEmbed((embed) => embed.setDescription(page));
		}

		return display.start(message);
	}

	private format(type: Type, input: string, output: string): TriggerIncludes | TriggerAlias {
		switch (type) {
			case Type.Alias:
				return { input, output };
			case Type.Reaction:
				return { action: 'react', input, output };
			default:
				throw new TypeError(`Unknown Type: ${type}`);
		}
	}

	private getListName(type: Type) {
		switch (type) {
			case Type.Alias:
				return GuildSettings.Trigger.Alias;
			case Type.Reaction:
				return GuildSettings.Trigger.Includes;
			default:
				throw new TypeError(`Unknown Type: ${type}`);
		}
	}

	private static type = Args.make<Type>((parameter, { argument }) => {
		const lowerCasedParameter = parameter.toLowerCase();
		if (lowerCasedParameter === 'alias') return Args.ok(Type.Alias);
		if (lowerCasedParameter === 'reaction') return Args.ok(Type.Reaction);
		return Args.error({ argument, parameter });
	});
}
