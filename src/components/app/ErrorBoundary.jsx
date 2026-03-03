import React from 'react';
import { Box, Typography, Button, Paper } from '@mui/material';

/**
 * Generic React Error Boundary.
 *
 * Catches runtime errors in any child component tree and renders a
 * user-friendly fallback instead of a white screen.
 *
 * Props:
 *  - title    {string}  Heading shown in the fallback UI (default: "Something went wrong")
 *  - message  {string}  Extra context shown below the heading
 *  - onReset  {function} Optional callback invoked when the user clicks "Try Again"
 *  - children {ReactNode}
 */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });
    console.error('[ErrorBoundary]', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    this.props.onReset?.();
  };

  render() {
    if (this.state.hasError) {
      const { title = 'Something went wrong', message } = this.props;

      return (
        <Paper
          elevation={0}
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            p: 4,
            textAlign: 'center',
            bgcolor: 'background.default',
          }}
        >
          <Typography variant="h5" gutterBottom color="error">
            {title}
          </Typography>

          {message && (
            <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
              {message}
            </Typography>
          )}

          <Typography
            variant="body2"
            color="text.secondary"
            sx={{
              mb: 3,
              maxWidth: 500,
              fontFamily: 'monospace',
              fontSize: '0.75rem',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
            }}
          >
            {this.state.error?.message || 'Unknown error'}
          </Typography>

          <Button variant="contained" onClick={this.handleReset}>
            Try Again
          </Button>
        </Paper>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
