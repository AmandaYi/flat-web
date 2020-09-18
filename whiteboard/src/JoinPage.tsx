import * as React from "react";
import {RouteComponentProps} from "react-router";
import "./JoinPage.less";
import logo from "./assets/image/logo.svg";
import {Button, Input} from "antd";
import {Link} from "react-router-dom";
import { Identity } from "./IndexPage";
import {LocalStorageRoomDataType} from "./HistoryPage";
import moment from "moment";

export type JoinPageStates = {
    roomId: string;
    name: string;
};

export default class JoinPage extends React.Component<RouteComponentProps<{}>, JoinPageStates> {
    public constructor(props: RouteComponentProps<{}>) {
        super(props);
        const name = localStorage.getItem("userName");
        this.state = {
            roomId: "",
            name: name ? name : "",
        };
    }

    private handleJoin = (): void => {
        const userId = `${Math.floor(Math.random() * 100000)}`;
        if (this.state.name !== localStorage.getItem("userName")) {
            localStorage.setItem("userName", this.state.name);
        }
        this.setRoomList(this.state.roomId, userId);
        this.props.history.push(`/whiteboard/${Identity.joiner}/${this.state.roomId}/${userId}/`);
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
    public render(): React.ReactNode {
        const {roomId, name} = this.state;
        return (
            <div className="page-index-box">
                <div className="page-index-mid-box">
                    <div className="page-index-logo-box">
                        <img src={logo} alt={"logo"}/>
                        <span>
                                0.0.1
                        </span>
                    </div>
                    <div className="page-index-form-box">
                        <Input placeholder={"输入名字"}
                               value={name}
                               onChange={evt => this.setState({name: evt.target.value})}
                               className="page-index-input-box"
                               size={"large"}/>
                        <Input placeholder={"输入房间号"}
                               value={roomId}
                               onChange={evt => this.setState({roomId: evt.target.value})}
                               className="page-index-input-box"
                               size={"large"}/>
                        <div className="page-index-btn-box">
                            <Link to={"/"}>
                                <Button className="page-index-btn"
                                        size={"large"}>
                                    返回首页
                                </Button>
                            </Link>
                            <Button className="page-index-btn"
                                    disabled={roomId === "" || name === ""}
                                    size={"large"}
                                    onClick={this.handleJoin}
                                    type={"primary"}>
                                加入房间
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }
}

