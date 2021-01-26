import type { ModerationEntity } from '#lib/database';
import { LanguageKeys } from '#lib/i18n/languageKeys';
import { SkyraCommand } from '#lib/structures';
import type { GuildMessage } from '#lib/types';
import { PermissionLevels } from '#lib/types/Enums';
import { Moderation } from '#utils/constants';
import { ApplyOptions } from '@sapphire/decorators';
import { Args } from '@sapphire/framework';
import { Time } from '@sapphire/time-utilities';
import { Permissions, User } from 'discord.js';
import type { TFunction } from 'i18next';

@ApplyOptions<SkyraCommand.Options>({
	cooldown: 5,
	description: LanguageKeys.Commands.Moderation.TimeDescription,
	extendedHelp: LanguageKeys.Commands.Moderation.TimeExtended,
	permissionLevel: PermissionLevels.Moderator,
	runIn: ['text']
})
export class UserCommand extends SkyraCommand {
	public async run(message: GuildMessage, args: SkyraCommand.Args) {
		const cancel = await args.pick(UserCommand.cancel).catch(() => false);
		const caseID = await args.pick('case');

		const entry = await message.guild.moderation.fetch(caseID);
		if (!entry) throw args.t(LanguageKeys.Commands.Moderation.ModerationCaseNotExists, { count: 1 });
		if (!cancel && entry.temporaryType) throw args.t(LanguageKeys.Commands.Moderation.TimeTimed);

		const user = await entry.fetchUser();
		await this.validateAction(message, args.t, entry, user);
		const task = this.context.client.schedules.queue.find(
			(tk) => tk.data && tk.data[Moderation.SchemaKeys.Case] === entry.caseID && tk.data[Moderation.SchemaKeys.Guild] === entry.guild.id
		)!;

		if (cancel) {
			if (!task) throw args.t(LanguageKeys.Commands.Moderation.TimeNotScheduled);

			await message.guild.moderation.fetchChannelMessages();
			await entry.edit({
				duration: null,
				moderatorID: message.author.id
			});

			return message.send(args.t(LanguageKeys.Commands.Moderation.TimeAborted, { title: entry.title }));
		}

		if (entry.appealType || entry.invalidated) {
			throw args.t(LanguageKeys.Commands.Moderation.ModerationLogAppealed);
		}

		if (task) {
			throw args.t(LanguageKeys.Commands.Moderation.ModerationTimed, {
				remaining: (task.data.timestamp as number) - Date.now()
			});
		}

		const duration = await args.rest('timespan', { minimum: Time.Second, maximum: Time.Year * 5 });
		await message.guild.moderation.fetchChannelMessages();
		await entry.edit({
			duration,
			moderatorID: message.author.id
		});
		return message.send(args.t(LanguageKeys.Commands.Moderation.TimeScheduled, { title: entry.title, user, time: duration! }));
	}

	private async validateAction(message: GuildMessage, t: TFunction, modlog: ModerationEntity, user: User) {
		switch (modlog.type) {
			case Moderation.TypeCodes.FastTemporaryBan:
			case Moderation.TypeCodes.TemporaryBan:
			case Moderation.TypeCodes.Ban:
				return this.checkBan(message, t, user);
			case Moderation.TypeCodes.FastTemporaryMute:
			case Moderation.TypeCodes.TemporaryMute:
			case Moderation.TypeCodes.Mute:
				return this.checkMute(message, t, user);
			case Moderation.TypeCodes.FastTemporaryVoiceMute:
			case Moderation.TypeCodes.TemporaryVoiceMute:
			case Moderation.TypeCodes.VoiceMute:
				return this.checkVMute(message, t, user);
			case Moderation.TypeCodes.Warning:
			case Moderation.TypeCodes.FastTemporaryWarning:
			case Moderation.TypeCodes.TemporaryWarning:
			// TODO(kyranet): Add checks for restrictions
			case Moderation.TypeCodes.RestrictionAttachment:
			case Moderation.TypeCodes.FastTemporaryRestrictionAttachment:
			case Moderation.TypeCodes.TemporaryRestrictionAttachment:
			case Moderation.TypeCodes.RestrictionEmbed:
			case Moderation.TypeCodes.FastTemporaryRestrictionEmbed:
			case Moderation.TypeCodes.TemporaryRestrictionEmbed:
			case Moderation.TypeCodes.RestrictionEmoji:
			case Moderation.TypeCodes.FastTemporaryRestrictionEmoji:
			case Moderation.TypeCodes.TemporaryRestrictionEmoji:
			case Moderation.TypeCodes.RestrictionReaction:
			case Moderation.TypeCodes.FastTemporaryRestrictionReaction:
			case Moderation.TypeCodes.TemporaryRestrictionReaction:
			case Moderation.TypeCodes.RestrictionVoice:
			case Moderation.TypeCodes.FastTemporaryRestrictionVoice:
			case Moderation.TypeCodes.TemporaryRestrictionVoice:
				return;
			default:
				throw t(LanguageKeys.Commands.Moderation.TimeUnsupportedType);
		}
	}

	private async checkBan(message: GuildMessage, t: TFunction, user: User) {
		if (!message.guild.me!.permissions.has(Permissions.FLAGS.BAN_MEMBERS)) {
			throw t(LanguageKeys.Commands.Moderation.UnbanMissingPermission);
		}

		if (!(await message.guild.security.actions.userIsBanned(user))) {
			throw t(LanguageKeys.Commands.Moderation.GuildBansNotFound);
		}
	}

	private async checkMute(message: GuildMessage, t: TFunction, user: User) {
		if (!message.guild.me!.permissions.has(Permissions.FLAGS.MANAGE_ROLES)) {
			throw t(LanguageKeys.Commands.Moderation.UnmuteMissingPermission);
		}

		if (!(await message.guild.security.actions.userIsMuted(user))) {
			throw t(LanguageKeys.Commands.Moderation.MuteUserNotMuted);
		}
	}

	private async checkVMute(message: GuildMessage, t: TFunction, user: User) {
		if (!message.guild.me!.permissions.has(Permissions.FLAGS.MUTE_MEMBERS)) {
			throw t(LanguageKeys.Commands.Moderation.VmuteMissingPermission);
		}

		if (!(await message.guild.security.actions.userIsVoiceMuted(user))) {
			throw t(LanguageKeys.Commands.Moderation.VmuteUserNotMuted);
		}
	}

	private static cancel = Args.make<boolean>((parameter, { argument }) => {
		if (parameter.toLowerCase() === 'cancel') return Args.ok(true);
		return Args.error({ argument, parameter });
	});
}
