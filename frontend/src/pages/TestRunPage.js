import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import {
  Container, Paper, Box, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, Button, Card, CardContent, LinearProgress, Chip, Alert
} from '@mui/material';
import { testRunAPI } from '../services/api';

export default function TestRunPage() {
  const { id } = useParams();
  const [testRun, setTestRun] = useState(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedResult, setSelectedResult] = useState(null);
  const [resultForm, setResultForm] = useState({ result_status: '', comments: '' });

  useEffect(() => {
    const load = async () => {
      try {
        const response = await testRunAPI.get(id);
        setTestRun(response.data);
      } catch (error) {
        console.error('Error loading test run:', error);
      }
    };
    load();
  }, [id]);

  

  const handleOpenResultDialog = (result) => {
    setSelectedResult(result);
    setResultForm({ result_status: result.result || 'Not Started', comments: result.comments || '' });
    setOpenDialog(true);
  };

  const handleSubmitResult = async () => {
    try {
      await testRunAPI.updateResult(selectedResult.id, resultForm);
      setOpenDialog(false);
      const response = await testRunAPI.get(id);
      setTestRun(response.data);
    } catch (error) {
      console.error('Error updating result:', error);
    }
  };

  if (!testRun) {
    return <Typography>Loading...</Typography>;
  }

  const stats = {
    total: testRun.results?.length || 0,
    passed: testRun.results?.filter(r => r.result === 'Pass').length || 0,
    failed: testRun.results?.filter(r => r.result === 'Fail').length || 0,
    skipped: testRun.results?.filter(r => r.result === 'Skip').length || 0,
    notStarted: testRun.results?.filter(r => !r.result).length || 0
  };

  const passPercentage = stats.total > 0 ? Math.round((stats.passed / stats.total) * 100) : 0;

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
          <Typography variant="h4" component="h1">{testRun.name}</Typography>
          <Chip
            label={testRun.computed_status || testRun.status || 'In Progress'}
            color={(testRun.computed_status || testRun.status) === 'Completed' ? 'success' : 'warning'}
            variant="filled"
          />
        </Box>
        {(testRun.computed_status || testRun.status) === 'Completed' && (
          <Alert severity="success" sx={{ mb: 2 }}>
            All test cases have been executed. This run is now <strong>Completed</strong>.
          </Alert>
        )}
        <Typography sx={{ color: '#666', mb: 3 }}>{testRun.description}</Typography>

        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 2, mb: 4 }}>
          <Card>
            <CardContent>
              <Typography color="textSecondary">Total Tests</Typography>
              <Typography variant="h5">{stats.total}</Typography>
            </CardContent>
          </Card>
          <Card sx={{ backgroundColor: '#4caf50', color: '#fff' }}>
            <CardContent>
              <Typography>Pass</Typography>
              <Typography variant="h5">{stats.passed}</Typography>
            </CardContent>
          </Card>
          <Card sx={{ backgroundColor: '#f44336', color: '#fff' }}>
            <CardContent>
              <Typography>Fail</Typography>
              <Typography variant="h5">{stats.failed}</Typography>
            </CardContent>
          </Card>
          <Card sx={{ backgroundColor: '#ff9800', color: '#fff' }}>
            <CardContent>
              <Typography>Skip</Typography>
              <Typography variant="h5">{stats.skipped}</Typography>
            </CardContent>
          </Card>
          <Card sx={{ backgroundColor: '#2196f3', color: '#fff' }}>
            <CardContent>
              <Typography>Pass Rate</Typography>
              <Typography variant="h5">{passPercentage}%</Typography>
            </CardContent>
          </Card>
        </Box>

        <Box sx={{ mb: 4 }}>
          <Typography variant="h6" sx={{ mb: 1 }}>Result Breakdown</Typography>
          <Box sx={{ mb: 1 }}>
            <Typography variant="body2">Pass: {stats.passed}</Typography>
            <LinearProgress
              variant="determinate"
              value={stats.total ? (stats.passed / stats.total) * 100 : 0}
              sx={{ height: 12, borderRadius: 1 }}
            />
          </Box>
          <Box sx={{ mb: 1 }}>
            <Typography variant="body2">Fail: {stats.failed}</Typography>
            <LinearProgress
              variant="determinate"
              value={stats.total ? (stats.failed / stats.total) * 100 : 0}
              sx={{ height: 12, borderRadius: 1, backgroundColor: '#fdecea' }}
            />
          </Box>
          <Box sx={{ mb: 1 }}>
            <Typography variant="body2">Skip: {stats.skipped}</Typography>
            <LinearProgress
              variant="determinate"
              value={stats.total ? (stats.skipped / stats.total) * 100 : 0}
              sx={{ height: 12, borderRadius: 1, backgroundColor: '#fff4e5' }}
            />
          </Box>
          <Box>
            <Typography variant="body2">Not Started: {stats.notStarted}</Typography>
            <LinearProgress
              variant="determinate"
              value={stats.total ? (stats.notStarted / stats.total) * 100 : 0}
              sx={{ height: 12, borderRadius: 1, backgroundColor: '#e8eaf6' }}
            />
          </Box>
        </Box>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead sx={{ backgroundColor: '#f5f5f5' }}>
            <TableRow>
              <TableCell><strong>Test Case</strong></TableCell>
              <TableCell><strong>Status</strong></TableCell>
              <TableCell><strong>Result</strong></TableCell>
              <TableCell align="center"><strong>Action</strong></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {testRun.results?.map(result => (
              <TableRow key={result.id}>
                <TableCell>{result.test_case_title}</TableCell>
                <TableCell>{result.status}</TableCell>
                <TableCell>{result.result || 'Not Started'}</TableCell>
                <TableCell align="center">
                  <Button size="small" onClick={() => handleOpenResultDialog(result)}>
                    {result.result ? 'Update' : 'Execute'}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Update Test Result</DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          <TextField
            fullWidth
            label="Result"
            name="result_status"
            select
            value={resultForm.result_status}
            onChange={(e) => setResultForm(prev => ({ ...prev, result_status: e.target.value }))}
            margin="normal"
            SelectProps={{ native: true }}
          >
            <option value="Not Started">Not Started</option>
            <option value="Pass">Pass</option>
            <option value="Fail">Fail</option>
            <option value="Skip">Skip</option>
          </TextField>
          <TextField
            fullWidth
            label="Comments"
            name="comments"
            value={resultForm.comments}
            onChange={(e) => setResultForm(prev => ({ ...prev, comments: e.target.value }))}
            margin="normal"
            multiline
            rows={3}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
          <Button onClick={handleSubmitResult} variant="contained">Save</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
