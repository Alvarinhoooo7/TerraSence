import Parse from 'parse/node';
import { container, injectable } from 'tsyringe';

import ChatUser from '../../models/Watch/ChatUser';
import Message from '../../models/Watch/Message';
import { WearerService } from './WearerService';

@injectable()
export class ChatUserService {
  async getChatUser({
    deviceId,
    imei,
    objectId,
  }: {
    deviceId?: string;
    imei?: string;
    objectId?: string;
  }) {
    let watch;
    const wearerService = container.resolve(WearerService);
    if (objectId) {
      watch = await wearerService.getWearerByObjectId({ objectId });
    } else {
      watch = await wearerService.getWearerByDeviceIdOrImei({
        deviceId,
        imei,
      });
    }
    if (!watch) {
      return [];
    }
    const wearer = watch[0];

    // Query for ChatUser records (Space 2 and Space 3)
    const chatUserQuery = new Parse.Query(ChatUser);
    chatUserQuery.include('watch');
    chatUserQuery.include('user');
    chatUserQuery.equalTo('watch', wearer);
    chatUserQuery.descending('updatedAt');
    chatUserQuery.limit(50);
    const chatUserResults = await chatUserQuery.find({ useMasterKey: true });

    // Query for Message records (Space lite and Space 1)
    const messageQuery = new Parse.Query(Message);
    messageQuery.include('from');
    messageQuery.include('watch');
    messageQuery.equalTo('watch', wearer);
    messageQuery.descending('updatedAt');
    messageQuery.limit(50);
    const messageResults = await messageQuery.find({ useMasterKey: true });

    const transformedChatUsers = chatUserResults.map((chatUser) => {
      let senderName = '';

      if (chatUser.get('sender') === 'watch') {
        // Get child name from wearer using firstName and lastName
        const wearerData = chatUser.get('watch');
        const firstName = wearerData?.get('firstName') || '';
        const lastName = wearerData?.get('lastName') || '';
        senderName = `${firstName} ${lastName}`.trim() || 'Watch';
      } else if (chatUser.get('sender') === 'app') {
        // Get name from User
        const user = chatUser.get('user');
        if (user) {
          const firstName = user.get('firstName') || '';
          const lastName = user.get('lastName') || '';
          senderName = `${firstName} ${lastName}`.trim() || 'User';
        } else {
          senderName = 'User';
        }
      }

      return {
        sender: senderName,
        type: chatUser.get('type'),
        date: chatUser.createdAt,
        source: 'ChatUser',
        status: chatUser.get('status'),
      };
    });

    const transformedMessages = messageResults.map((message) => {
      let senderName = '';
      let messageType = '';

      if (message.get('from')) {
        // Has from field, so it's from app
        const user = message.get('from');
        const firstName = user.get('firstName') || '';
        const lastName = user.get('lastName') || '';
        senderName = `${firstName} ${lastName}`.trim() || 'User';
      } else {
        // No from field, so it's from watch
        const wearerData = message.get('watch');
        const firstName = wearerData?.get('firstName') || '';
        const lastName = wearerData?.get('lastName') || '';
        senderName = `${firstName} ${lastName}`.trim() || 'Watch';
      }

      // Determine type based on content
      if (message.get('text') && message.get('text').trim() !== '') {
        messageType = 'text';
      } else if (message.get('audio')) {
        messageType = 'audio';
      } else if (message.get('image')) {
        messageType = 'image';
      } else {
        messageType = 'unknown';
      }

      // Status logic
      const sent = message.get('sent');
      const received = message.get('received');
      let status;
      if (sent === true && received === true) {
        status = 'received';
      } else if (
        sent === true &&
        (received === undefined || received === null)
      ) {
        status = 'sent';
      } else {
        status = 'failed';
      }

      return {
        sender: senderName,
        type: messageType,
        date: message.createdAt,
        source: 'Message',
        status,
      };
    });

    const allMessages = [...transformedChatUsers, ...transformedMessages];
    allMessages.sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    return allMessages.slice(0, 20);
  }
}
