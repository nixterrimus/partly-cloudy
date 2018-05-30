/**
 * A sample app that grows from state to redux
 */

//#region Imports
import React from "react";
import { Component } from "react";
import {
  Platform,
  StyleSheet,
  Text,
  View,
  ActivityIndicator,
  TouchableWithoutFeedback,
  ScrollView,
  RefreshControl,
  Animated
} from "react-native";
import moment from "moment";

import { createStore } from "redux";

//#endregion

//#region App

/*
The top level app definition
*/
type AppProps = {};
type AppState = {
  upcomingWeather: null | any;
  isLoading: boolean;
  lastUpdated: number;
};
type InitializationAction = {
  type: "INITIALIZATION";
};
type LoadBeganAction = {
  type: "LOAD_BEGAN";
};
type LoadComplete = {
  type: "LOAD_COMPLETE";
  lastUpdated: number;
  upcomingWeather: any;
};
type Action = InitializationAction | LoadBeganAction | LoadComplete;
const defaultAppState: AppState = {
  upcomingWeather: null,
  isLoading: false,
  lastUpdated: 0
};

function nextState(
  currentState: AppState | undefined = defaultAppState,
  action: Action
): AppState {
  if (action.type == "LOAD_BEGAN") {
    return {
      ...currentState,
      isLoading: true
    };
  } else if (action.type == "LOAD_COMPLETE") {
    return {
      ...currentState,
      isLoading: false,
      upcomingWeather: action.upcomingWeather,
      lastUpdated: action.lastUpdated
    };
  }
  return currentState;
}

const store = createStore(nextState);

export default class App extends Component<AppProps, AppState> {
  constructor(props: AppProps) {
    super(props);
    this.state = nextState(undefined, {
      type: "INITIALIZATION"
    });

    store.subscribe(() => this.forceUpdate());
  }
  async componentDidMount() {
    this.onRequestUpdatedData();
  }

  onRequestUpdatedData = async () => {
    store.dispatch({
      type: "LOAD_BEGAN"
    });
    const weather = await fetchWeather();
    const upcomingWeather = weather["daily"].data
      .sort((a: any, b: any) => a["time"] - b["time"])
      .slice(0, 4)
      .map((day: any) => ({
        highTemperature: day["temperatureLow"],
        lowTemperature: day["temperatureHigh"],
        date: day["time"],
        icon: day["icon"]
      }));
    store.dispatch({
      type: "LOAD_COMPLETE",
      upcomingWeather: upcomingWeather,
      lastUpdated: new Date().getTime()
    });
  };

  render() {
    const state = store.getState();

    const { upcomingWeather } = state;
    if (upcomingWeather == null) {
      return <LoadingScene />;
    }
    return (
      <WeatherScene
        upcomingWeather={state.upcomingWeather}
        isLoading={state.isLoading}
        onRequestUpdatedData={this.onRequestUpdatedData}
        location="Mountain View"
        lastUpdated={state.lastUpdated}
      />
    );
  }
}

//#endregion

//#region Scene Defintions

/*
These are components that are meant to take up the whole screen
*/
type WeatherSceneProps = {
  upcomingWeather: Array<UpcomingWeatherItem>;
  isLoading: boolean;
  onRequestUpdatedData: () => void;
  location: string;
  lastUpdated: number;
};

type UpcomingWeatherItem = {
  highTemperature: number;
  lowTemperature: number;
  date: number;
  icon: string;
};
type WeatherSceneState = {
  selectedDay: number;
};

/**
 * Displays a loaded weather scene for a given location
 * It's ok to show stale data with this while data is fetching if `isLoading` is
 * set to true
 */
class WeatherScene extends Component<WeatherSceneProps, WeatherSceneState> {
  static dayColors = ["#D8ABCD", "#D19FC5", "#C48AB9", "#B97AB0"];
  constructor(props: WeatherSceneProps) {
    super(props);
    this.state = {
      selectedDay: 0
    };
  }

  render() {
    const { selectedDay } = this.state;
    const selectedDayItem = this.props.upcomingWeather[selectedDay];

    return (
      <View
        style={{
          flex: 1,
          paddingTop: 22,
          backgroundColor: "#AF6CA8"
        }}
      >
        <CurrentWeather
          location={this.props.location}
          date={new Date().getTime()}
          averageTemperature={Math.floor(
            (selectedDayItem.highTemperature + selectedDayItem.lowTemperature) /
              2
          )}
          dayLowTemperature={selectedDayItem.lowTemperature}
          dayHighTemperature={selectedDayItem.highTemperature}
          isRefreshing={this.props.isLoading}
          onRefresh={this.props.onRequestUpdatedData}
          lastUpdated={this.props.lastUpdated}
        />
        <View
          style={{
            height: 120,
            flexDirection: "row"
          }}
        >
          {this.props.upcomingWeather.map((upcoming, index) => (
            <DayItem
              key={upcoming.date}
              backgroundColor={WeatherScene.dayColors[index]}
              isSelected={this.state.selectedDay == index}
              onPress={() => {
                this.setState({ selectedDay: index });
              }}
              dayName={moment.unix(upcoming.date).format("dddd")}
              icon={emojiForDescription(upcoming.icon)}
              averageTemperature={Math.floor(
                (upcoming.highTemperature + upcoming.lowTemperature) / 2
              )}
            />
          ))}
        </View>
      </View>
    );
  }
}

/**
 * A full screen component that shows a loading indicator
 * Use this when there's no content to show the user but you want to
 * indicate that content is coming eventually
 */
class LoadingScene extends Component {
  render() {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: "#AF6CA8"
        }}
      >
        <ActivityIndicator size="large" color="white" />
      </View>
    );
  }
}
//#endregion

//#region Components
/*
These are components that are used by the scenes
*/
type CurrentWeatherProps = {
  location: string;
  date: number;
  averageTemperature: number;
  dayLowTemperature: number;
  dayHighTemperature: number;
  isRefreshing: boolean;
  onRefresh: () => void;
  lastUpdated: number;
};
class CurrentWeather extends Component<CurrentWeatherProps> {
  render() {
    const {
      location,
      date,
      averageTemperature,
      dayLowTemperature,
      dayHighTemperature,
      isRefreshing,
      onRefresh,
      lastUpdated
    } = this.props;
    return (
      <ScrollView
        style={{
          flex: 1
        }}
        contentContainerStyle={{
          paddingHorizontal: 16,
          justifyContent: "center",
          paddingTop: 30
        }}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            tintColor="white"
          />
        }
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center"
          }}
        >
          <View>
            <Text
              style={{
                fontSize: 16,
                color: "white",
                textAlign: "center"
              }}
            >
              {location}
            </Text>
            <Text
              style={{
                fontSize: 12,
                color: "white",
                textAlign: "center"
              }}
            >
              Updated {moment(lastUpdated).format("dddd, MMM Do hh:m a")}
            </Text>
          </View>
        </View>
        <Text
          style={{
            fontSize: 200,
            fontWeight: "100",
            textAlign: "center",
            color: "white"
          }}
        >
          {averageTemperature}°
        </Text>
        <View
          style={{
            flexDirection: "row",
            justifyContent: "center"
          }}
        >
          <Text
            style={{
              color: "white"
            }}
          >
            {` ${dayLowTemperature}°  /  ${dayHighTemperature}°`}
          </Text>
        </View>
      </ScrollView>
    );
  }
}

type DateItemProps = {
  backgroundColor: string;
  isSelected?: boolean;
  dayName: string;
  icon: string;
  averageTemperature: number;
  onPress: () => void;
};

type DateItemState = {
  selectedAnimator: Animated.Value;
};
class DayItem extends Component<DateItemProps, DateItemState> {
  constructor(props: DateItemProps) {
    super(props);
    this.state = {
      selectedAnimator: new Animated.Value(props.isSelected ? 1.0 : 0.0)
    };
  }

  UNSAFE_componentWillReceiveProps(nextProps: DateItemProps) {
    Animated.spring(this.state.selectedAnimator, {
      toValue: nextProps.isSelected ? 1.0 : 0.0
    }).start();
  }

  render() {
    const {
      isSelected,
      dayName,
      onPress,
      averageTemperature,
      icon,
      backgroundColor
    } = this.props;

    const offset = this.state.selectedAnimator.interpolate({
      inputRange: [0, 1],
      outputRange: [0, -10]
    });

    const shadowOffset = this.state.selectedAnimator.interpolate({
      inputRange: [0, 1],
      outputRange: [0, 1]
    });

    return (
      <TouchableWithoutFeedback
        onPress={onPress}
        style={{
          backgroundColor: backgroundColor,
          flex: 1
        }}
        disabled={isSelected}
      >
        <Animated.View
          style={{
            backgroundColor: backgroundColor,
            flex: 1,
            justifyContent: "space-between",
            paddingVertical: 20,
            shadowColor: "white",
            shadowOpacity: shadowOffset,
            shadowRadius: 20,
            shadowOffset: {
              height: -10,
              width: 0
            },
            transform: [{ translateY: offset }]
          }}
        >
          <Text
            style={{
              textAlign: "center",
              color: "white"
            }}
          >
            {dayName}
          </Text>
          <Text
            style={{
              textAlign: "center",
              fontSize: 40
            }}
          >
            {icon}
          </Text>
          <Text
            style={{
              textAlign: "center",
              color: "white"
            }}
          >
            {averageTemperature}°
          </Text>
        </Animated.View>
      </TouchableWithoutFeedback>
    );
  }
}
//#endregion

//#region Utility Functions
async function fetchWeather() {
  const result = await fetch(
    "https://api.darksky.net/forecast/9ea775299f0e13eaccee5d4d2727a761/37.3967304,-122.08392220000002"
  );
  return result.json();
}

function emojiForDescription(description: string): string {
  switch (description) {
    case "clear-day":
      return "☀️";
    case "partly-cloudy-day":
      return "⛅️";
    default:
      return "☁️";
  }
}
//#endregion
