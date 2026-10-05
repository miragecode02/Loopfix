import { Component, type ReactNode } from 'react'
import FeedbackState from './FeedbackState'

type Props = { children: ReactNode }
type State = { error: Error | null }

export default class WorkspaceErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  render() {
    if (this.state.error) {
      return (
        <FeedbackState
          eyebrow="Workspace error"
          title="This view hit an unexpected problem."
          description={this.state.error.message}
          action={{ label: 'Reload the workspace', onClick: () => window.location.reload() }}
        />
      )
    }
    return this.props.children
  }
}
