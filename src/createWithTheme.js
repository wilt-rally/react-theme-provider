/* @flow */

import * as React from 'react';
import PropTypes from 'prop-types';
import { defaultChannel } from './constants';

type withThemeRetunType<Theme, Props: {}> = React.ComponentType<
  React.ElementConfig<React.ComponentType<$Diff<Props, { theme: Theme }>>>
>;

export type WithThemeType<T> = <Props: {}>(
  Comp: React.ComponentType<Props>
) => withThemeRetunType<T, Props>;

const createWithTheme = <T>(
  channel?: string = defaultChannel
): WithThemeType<T> =>
  function withTheme<Props: {}>(
    Comp: React.ComponentType<Props>
  ): withThemeRetunType<T, Props> {
    class ThemedComponent extends React.PureComponent<*, { theme: T }> {
      static displayName = `withTheme(${Comp.displayName || Comp.name})`;

      static propTypes = {
        theme: PropTypes.object,
      };

      static contextTypes = {
        [channel]: PropTypes.object,
      };

      constructor(props, context) {
        super(props, context);

        const theme = this.context[channel] && this.context[channel].get();

        if (typeof theme !== 'object' && typeof this.props.theme !== 'object') {
          throw new Error(
            `Couldn't find theme in the context or props. ` +
              `You need to wrap your component in '<ThemeProvider />' or pass a 'theme' prop`
          );
        }

        this.state = {
          theme: this._merge(theme, this.props.theme),
        };
      }

      componentDidMount() {
        this._subscription =
          this.context[channel] &&
          this.context[channel].subscribe(theme =>
            this.setState({ theme: this._merge(theme, this.props.theme) })
          );
      }

      componentWillReceiveProps(nextProps: *) {
        if (this.props.theme !== nextProps.theme) {
          this.setState({
            theme: this._merge(
              this.context[channel] && this.context[channel].get(),
              nextProps.theme
            ),
          });
        }
      }

      componentWillUnmount() {
        this._subscription && this._subscription.remove();
      }

      getWrappedInstance() {
        return this._root;
      }

      setNativeProps(...args) {
        return this._root.setNativeProps(...args);
      }

      _merge = (a, b) => {
        if (a && b) {
          return { ...a, ...b };
        }
        return a || b;
      };

      _subscription: { remove: Function };
      _root: any;

      render() {
        return (
          <Comp
            {...this.props}
            ref={c => {
              this._root = c;
            }}
            theme={this.state.theme}
          />
        );
      }
    }

    // This is ugly, but we need to hoist static properties manually
    for (const prop in Comp) {
      if (prop !== 'displayName' && prop !== 'contextTypes') {
        if (prop === 'propTypes') {
          // Only the underlying component will receive the theme prop
          // $FlowFixMe
          const { theme, ...propTypes } = Comp[prop]; // eslint-disable-line no-unused-vars
          /* $FlowFixMe */
          ThemedComponent[prop] = propTypes;
        } else {
          /* $FlowFixMe */
          ThemedComponent[prop] = Comp[prop];
        }
      }
    }

    return ThemedComponent;
  };

export default createWithTheme;