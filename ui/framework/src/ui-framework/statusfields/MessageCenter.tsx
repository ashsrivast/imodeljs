/*---------------------------------------------------------------------------------------------
* Copyright (c) 2019 Bentley Systems, Incorporated. All rights reserved.
* Licensed under the MIT License. See LICENSE.md in the project root for license terms.
*--------------------------------------------------------------------------------------------*/
/** @module Notification */

import * as React from "react";

import { NotifyMessageDetails, OutputMessagePriority } from "@bentley/imodeljs-frontend";

import { UiFramework } from "../UiFramework";

import { StatusBarFieldId } from "../statusbar/StatusBarWidgetControl";
import { MessageManager, MessageAddedEventArgs } from "../messages/MessageManager";
import {
  MessageCenter, MessageCenterTab, MessageCenterMessage, MessageCenterDialog, FooterPopup,
} from "@bentley/ui-ninezone";
import { StatusFieldProps } from "./StatusFieldProps";
import { MessageSpan } from "../messages/MessageSpan";

/** Enum for the [[MessageCenterField]] active tab
 * @internal
 */
enum MessageCenterActiveTab {
  AllMessages,
  Problems,
}

/** State for the [[MessageCenterField]] React component
 * @internal
 */
interface MessageCenterState {
  activeTab: MessageCenterActiveTab;
  target: HTMLDivElement | null;
  messageCount: number;
}

/** Properties of [[MessageCenterField]] component.
 * @public
 */
export interface MessageCenterFieldProps extends StatusFieldProps {
  /** Message center dialog target. */
  targetRef?: React.Ref<HTMLElement>;
}

/** Message Center Field React component.
 * @public
 */
export class MessageCenterField extends React.Component<MessageCenterFieldProps, MessageCenterState> {
  private _className: string;
  private _indicator = React.createRef<HTMLDivElement>();
  private _title = UiFramework.translate("messageCenter.messages");

  public readonly state: Readonly<MessageCenterState> = {
    activeTab: MessageCenterActiveTab.AllMessages,
    target: null,
    messageCount: MessageManager.messages.length,
  };

  constructor(p: MessageCenterFieldProps) {
    super(p);

    const instance = this.constructor;
    this._className = instance.name;
  }

  /** @internal */
  public componentDidMount() {
    MessageManager.onMessageAddedEvent.addListener(this._handleMessageAddedEvent);
  }

  /** @internal */
  public componentWillUnmount() {
    MessageManager.onMessageAddedEvent.removeListener(this._handleMessageAddedEvent);
  }

  private _handleMessageAddedEvent = (_args: MessageAddedEventArgs) => {
    this.setState({ messageCount: MessageManager.messages.length });
  }

  public render(): React.ReactNode {
    const tooltip = `${this.state.messageCount} ${this._title}`;
    const footerMessages = (
      <>
        <div
          className={this.props.className}
          style={this.props.style}
          title={tooltip}
        >
          <MessageCenter
            indicatorRef={this._indicator}
            isInFooterMode={this.props.isInFooterMode}
            label={this.props.isInFooterMode ? this._title : undefined}
            onClick={this._handleMessageIndicatorClick}
            targetRef={this._handleTargetRef}
          >
            {this.state.messageCount.toString()}
          </MessageCenter>
        </div>
        <FooterPopup
          isOpen={this.props.openWidget === this._className}
          onClose={this._handleClose}
          onOutsideClick={this._handleOutsideClick}
          target={this.state.target}
        >
          <MessageCenterDialog
            prompt={UiFramework.translate("messageCenter.prompt")}
            tabs={
              <>
                <MessageCenterTab
                  isActive={this.state.activeTab === MessageCenterActiveTab.AllMessages}
                  onClick={() => this._changeActiveTab(MessageCenterActiveTab.AllMessages)}
                >
                  {UiFramework.translate("messageCenter.all")}
                </MessageCenterTab>
                <MessageCenterTab
                  isActive={this.state.activeTab === MessageCenterActiveTab.Problems}
                  onClick={() => this._changeActiveTab(MessageCenterActiveTab.Problems)}
                >
                  {UiFramework.translate("messageCenter.errors")}
                </MessageCenterTab>
              </>
            }
            title={this._title}
          >
            {this.getMessages()}
          </MessageCenterDialog>
        </FooterPopup>
      </>
    );

    return footerMessages;
  }

  private _handleTargetRef = (target: HTMLDivElement | null) => {
    if (typeof this.props.targetRef === "function")
      this.props.targetRef(target);
    else if (this.props.targetRef)
      (this.props.targetRef as React.MutableRefObject<HTMLElement | null>).current = target;
    this.setState({ target });
  }

  private _handleClose = () => {
    this.setOpenWidget(null);
  }

  private _handleOutsideClick = (e: MouseEvent) => {
    if (!this._indicator.current ||
      !(e.target instanceof Node) ||
      this._indicator.current.contains(e.target))
      return;

    this._handleClose();
  }

  private _handleMessageIndicatorClick = () => {
    const isOpen = this.props.openWidget === this._className;
    if (isOpen)
      this.setOpenWidget(null);
    else
      this.setOpenWidget(this._className);
  }

  private _changeActiveTab = (tab: MessageCenterActiveTab) => {
    this.setState({ activeTab: tab });
  }

  private getMessages(): React.ReactChild[] {
    const messages = MessageManager.messages.slice(0).reverse();
    const tabRows: React.ReactChild[] = new Array<React.ReactChild>();

    messages.forEach((details: NotifyMessageDetails, index: number) => {
      /* istanbul ignore else */
      if (this.state.activeTab === MessageCenterActiveTab.AllMessages || this.isProblemStatus(details.priority)) {

        const iconClassName = MessageManager.getIconClassName(details);
        const message = details.briefMessage;

        tabRows.push(
          <MessageCenterMessage
            key={index.toString()}
            icon={<i className={iconClassName} />}
          >
            <MessageSpan message={message} />
            {details.detailedMessage &&
              <>
                <br />
                <MessageSpan className="uicore-text-small" message={details.detailedMessage} />
              </>
            }
          </MessageCenterMessage>,
        );
      }
    });

    return tabRows;
  }

  private isProblemStatus(priority: OutputMessagePriority): boolean {
    // See priority values in DgnPlatform defined in NotificationManager

    if (priority === OutputMessagePriority.Error || priority === OutputMessagePriority.Fatal)
      return true;

    return false;
  }

  private setOpenWidget(openWidget: StatusBarFieldId) {
    // istanbul ignore else
    if (this.props.onOpenWidget)
      this.props.onOpenWidget(openWidget);
  }
}
