import * as React from "react";
import {RouteComponentProps} from "react-router";
import {createPlugins, DefaultHotKeys, Room, RoomPhase, RoomState, ViewMode, WhiteWebSdk} from "white-web-sdk";
import ToolBox from "@netless/tool-box";
import RedoUndo from "@netless/redo-undo";
import PageController from "@netless/page-controller";
import ZoomController from "@netless/zoom-controller";
import OssUploadButton from "@netless/oss-upload-button";
import {videoPlugin} from "@netless/white-video-plugin";
import {audioPlugin} from "@netless/white-audio-plugin";
import PreviewController from "@netless/preview-controller";
import DocsCenter from "@netless/docs-center";
import {CursorTool} from "@netless/cursor-tool";
import {message, Tooltip} from "antd";
import {netlessWhiteboardApi} from "./apiMiddleware";
import PageError from "./PageError";
import LoadingPage from "./LoadingPage";
import pages from "./assets/image/pages.svg"
import folder from "./assets/image/folder.svg";
import follow from "./assets/image/follow.svg"
import followActive from "./assets/image/follow-active.svg";
import logo from "./assets/image/logo.svg";
import {netlessToken, ossConfigObj} from "./appToken";
import "./WhiteboardPage.less";
import InviteButton from "./components/InviteButton";
import ExitButtonRoom from "./components/ExitButtonRoom";
import {Identity} from "./IndexPage";
import OssDropUpload from "@netless/oss-drop-upload";
import {pptDatas} from "./taskUuids";
import {PPTDataType, PPTType} from "@netless/oss-upload-manager";
import {v4 as uuidv4} from "uuid";
import moment from "moment";
import {LocalStorageRoomDataType} from "./HistoryPage";

export type WhiteboardPageStates = {
    phase: RoomPhase;
    room?: Room;
    isMenuVisible: boolean;
    isFileOpen: boolean;
    mode?: ViewMode;
    whiteboardLayerDownRef?: HTMLDivElement;
    roomController?: ViewMode;
};
export type WhiteboardPageProps = RouteComponentProps<{
    identity: Identity;
    uuid: string;
    userId: string;
}>;
export default class WhiteboardPage extends React.Component<WhiteboardPageProps, WhiteboardPageStates> {
    public constructor(props: WhiteboardPageProps) {
        super(props);
        this.state = {
            phase: RoomPhase.Connecting,
            isMenuVisible: false,
            isFileOpen: false,
        };
    }

    public async componentDidMount(): Promise<void> {
        await this.startJoinRoom();
    }

    private getRoomToken = async (uuid: string): Promise<string | null> => {
        const roomToken = await netlessWhiteboardApi.room.joinRoomApi(uuid);
        if (roomToken) {
            return roomToken;
        } else {
            return null;
        }
    }
    private handleBindRoom = (ref: HTMLDivElement): void => {
        const {room} = this.state;
        this.setState({whiteboardLayerDownRef: ref});
        if (room) {
            room.bindHtmlElement(ref);
        }
    }

    private setDefaultPptData = (pptDatas: string[], room: Room): void => {
        const docs: PPTDataType[] = (room.state.globalState as any).docs;
        if (docs && docs.length > 1) {
            return;
        }
        if (pptDatas.length > 0) {
            for(let pptData of pptDatas){
                const sceneId = uuidv4();
                const scenes = JSON.parse(pptData);
                const documentFile: PPTDataType = {
                    active: false,
                    id: sceneId,
                    pptType: PPTType.dynamic,
                    data: scenes,
                };
                const docs = (room.state.globalState as any).docs;
                if (docs && docs.length > 0) {
                    const newDocs = [documentFile, ...docs];
                    room.setGlobalState({docs: newDocs});
                } else {
                    room.setGlobalState({docs: [documentFile]});
                }
                room.putScenes(`/${room.uuid}/${sceneId}`, scenes);
            }
        }
    }

    public setRoomList = (uuid: string, userId: string): void => {
        const rooms = localStorage.getItem("rooms");
        const timestamp = moment(new Date()).format("lll");
        if (rooms) {
            const roomArray: LocalStorageRoomDataType[] = JSON.parse(rooms);
            const room = roomArray.find(data => data.uuid === uuid);
            if (!room) {
                localStorage.setItem(
                    "rooms",
                    JSON.stringify([
                        {
                            uuid: uuid,
                            time: timestamp,
                            identity: Identity.creator,
                            userId: userId,
                        },
                        ...roomArray,
                    ]),
                );
            } else {
                const newRoomArray = roomArray.filter(data => data.uuid !== uuid);
                localStorage.setItem(
                    "rooms",
                    JSON.stringify([
                        {
                            uuid: uuid,
                            time: timestamp,
                            identity: Identity.creator,
                            userId: userId,
                        },
                        ...newRoomArray,
                    ]),
                );
            }
        } else {
            localStorage.setItem(
                "rooms",
                JSON.stringify([
                    {
                        uuid: uuid,
                        time: timestamp,
                        identity: Identity.creator,
                        userId: userId,
                    },
                ]),
            );
        }
    };
    private startJoinRoom = async (): Promise<void> => {
        const {uuid, userId, identity} = this.props.match.params;
        this.setRoomList(uuid, userId);
        try {
            const roomToken = await this.getRoomToken(uuid);
            if (uuid && roomToken) {
                const plugins = createPlugins({"video": videoPlugin, "audio": audioPlugin});
                plugins.setPluginContext("video", {identity: identity === Identity.creator ? "host" : ""});
                plugins.setPluginContext("audio", {identity: identity === Identity.creator ? "host" : ""});
                const whiteWebSdk = new WhiteWebSdk({
                    appIdentifier: netlessToken.appIdentifier,
                    plugins: plugins,
                });
                const cursorName = localStorage.getItem("userName");
                const cursorAdapter = new CursorTool();
                const room = await whiteWebSdk.joinRoom({
                        uuid: uuid,
                        roomToken: roomToken,
                        cursorAdapter: cursorAdapter,
                        userPayload: {
                            userId: userId,
                            cursorName: cursorName,
                        },
                        floatBar: true,
                        hotKeys: {
                            ...DefaultHotKeys,
                            changeToSelector: "s",
                            changeToLaserPointer: "l",
                            changeToPencil: "p",
                            changeToRectangle: "r",
                            changeToEllipse: "c",
                            changeToEraser: "e",
                            changeToStraight: "t",
                            changeToArrow: "a",
                            changeToHand: "h",
                        },
                    },
                    {
                        onPhaseChanged: phase => {
                            this.setState({phase: phase});
                        },
                        onRoomStateChanged: (modifyState: Partial<RoomState>): void => {
                            if (modifyState.broadcastState) {
                                this.setState({mode: modifyState.broadcastState.mode});
                            }
                        },
                        onDisconnectWithError: error => {
                            console.error(error);
                        },
                        onKickedWithReason: reason => {
                            console.error("kicked with reason: " + reason);
                        },
                    });
                cursorAdapter.setRoom(room);
                room.setMemberState({
                    pencilOptions: {
                        disableBezier: false,
                        sparseHump: 1.0,
                        sparseWidth: 1.0,
                        enableDrawPoint: false
                    }
                });
                this.setDefaultPptData(pptDatas, room);
                if (room.state.broadcastState) {
                    this.setState({mode: room.state.broadcastState.mode})
                }
                this.setState({room: room});
                (window as any).room = room;
            }
        } catch (error) {
            message.error(error);
            console.log(error);
        }
    }

    private handlePreviewState = (state: boolean): void => {
        this.setState({isMenuVisible: state});
    }

    private handleDocCenterState = (state: boolean): void => {
        this.setState({isFileOpen: state});
    }

    private handleRoomController = (room: Room): void => {
        if (room.state.broadcastState.mode !== ViewMode.Broadcaster) {
            room.setViewMode(ViewMode.Broadcaster);
            message.success("其他用户将跟随您的视角");
        } else {
            room.setViewMode(ViewMode.Freedom);
            message.success("其他用户将停止跟随您的视角");
        }
    }

    public render(): React.ReactNode {
        const {room, isMenuVisible, isFileOpen, phase, whiteboardLayerDownRef} = this.state;
        const { identity, uuid, userId } = this.props.match.params;
        if (room === undefined) {
            return <LoadingPage/>;
        }
        switch (phase) {
            case (RoomPhase.Connecting || RoomPhase.Disconnecting || RoomPhase.Reconnecting || RoomPhase.Reconnecting): {
                return <LoadingPage/>;
            }
            case RoomPhase.Disconnected: {
                return <PageError/>;
            }
            default: {
                return (
                    <div className="realtime-box">
                        <div className="logo-box">
                            <img src={logo} alt={"logo"}/>
                        </div>
                        <div className="tool-box-out">
                            <ToolBox room={room} customerComponent={
                                [
                                    <OssUploadButton oss={ossConfigObj}
                                                     appIdentifier={netlessToken.appIdentifier}
                                                     sdkToken={netlessToken.sdkToken}
                                                     room={room}
                                                     whiteboardRef={whiteboardLayerDownRef}/>,
                                ]
                            }/>
                        </div>
                        <div className="redo-undo-box">
                            <RedoUndo room={room}/>
                        </div>
                        <div className="zoom-controller-box">
                            <ZoomController room={room}/>
                        </div>
                        <div className="room-controller-box">
                            <div className="page-controller-mid-box">
                                <Tooltip placement="bottom" title={"Vision control"}>
                                    <div className="page-controller-cell"
                                         onClick={()=> this.handleRoomController(room)}>
                                        <img src={this.state.mode === ViewMode.Broadcaster ? followActive : follow} alt={"follow"}/>
                                    </div>
                                </Tooltip>
                                <Tooltip placement="bottom" title={"Docs center"}>
                                    <div className="page-controller-cell"
                                         onClick={() => this.setState({isFileOpen: !this.state.isFileOpen})}>
                                        <img src={folder} alt={"folder"}/>
                                    </div>
                                </Tooltip>
                                <InviteButton uuid={uuid}/>
                                <ExitButtonRoom identity={identity} room={room} userId={userId} />
                            </div>
                        </div>
                        <div className="page-controller-box">
                            <div className="page-controller-mid-box">
                                <Tooltip placement="top" title={"Page preview"}>
                                    <div className="page-controller-cell" onClick={() => this.handlePreviewState(true)}>
                                        <img src={pages} alt={"pages"}/>
                                    </div>
                                </Tooltip>
                                <PageController room={room}/>
                            </div>
                        </div>
                        <PreviewController handlePreviewState={this.handlePreviewState} isVisible={isMenuVisible}
                                           room={room}/>
                        <DocsCenter handleDocCenterState={this.handleDocCenterState}
                                    isFileOpen={isFileOpen}
                                    room={room}/>
                        <OssDropUpload
                            room={room}
                            oss={ossConfigObj}>
                            <div
                                ref={this.handleBindRoom}
                                className="whiteboard-box"/>
                        </OssDropUpload>
                    </div>
                );
            }
        }
    }
}
